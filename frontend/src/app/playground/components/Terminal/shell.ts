// A small POSIX-flavoured shell: quoted words, parameters, command and
// arithmetic substitution, globbing, pipelines, redirections and lists.

import {
  FileSystem,
  FsError,
  FsNode,
  STRERROR,
  joinPath,
} from "./fs";
import {
  buildDefaultFileSystem,
  HOME,
  HOSTNAME,
  installBinaries,
  USER,
} from "./defaultFileSystem";
import {
  COMMANDS,
  COMMAND_NAMES,
  ExecContext,
  ExecResult,
  ShellHandle,
} from "./commands";

// ---------------------------------------------------------------------------
// Word model (expansion is deferred until execution so assignments work)
// ---------------------------------------------------------------------------

type WordPart =
  | { type: "literal"; value: string; quoted: boolean }
  | {
      type: "variable";
      name: string;
      quoted: boolean;
      length?: boolean;
      op?: ":-" | ":=" | ":+" | "-" | "=" | "+";
      arg?: string;
    }
  | { type: "command"; source: string; quoted: boolean }
  | { type: "arith"; source: string; quoted: boolean };

interface WordToken {
  kind: "word";
  parts: WordPart[];
  glob: boolean;
  tilde: boolean;
}

interface OpToken {
  kind: "op";
  value: string;
}

type Token = WordToken | OpToken;

export class ShellSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShellSyntaxError";
  }
}

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let parts: WordPart[] = [];
  let active = false;
  let glob = false;
  let tilde = false;
  let wordQuoted = false;
  let i = 0;

  const appendLiteral = (value: string, quoted: boolean): void => {
    if (value === "" && !quoted) return;
    active = true;
    if (quoted) wordQuoted = true;
    const last = parts[parts.length - 1];
    if (last && last.type === "literal" && last.quoted === quoted) {
      last.value += value;
    } else {
      parts.push({ type: "literal", value, quoted });
    }
  };

  const flush = (): void => {
    if (!active && parts.length === 0) return;
    tokens.push({ kind: "word", parts, glob, tilde });
    parts = [];
    active = false;
    glob = false;
    tilde = false;
    wordQuoted = false;
  };

  const pushOp = (value: string): void => {
    flush();
    tokens.push({ kind: "op", value });
  };

  const wordIsFd = (): string | null => {
    if (!active || wordQuoted || glob || parts.length !== 1) return null;
    const only = parts[0];
    if (only.type !== "literal") return null;
    return only.value === "1" || only.value === "2" ? only.value : null;
  };

  const findClosingParen = (start: number): number => {
    let depth = 1;
    let j = start;
    let quote: string | null = null;
    while (j < line.length) {
      const ch = line[j];
      if (quote) {
        if (ch === "\\" && quote === '"') {
          j += 2;
          continue;
        }
        if (ch === quote) quote = null;
        j++;
        continue;
      }
      if (ch === "'" || ch === '"') {
        quote = ch;
        j++;
        continue;
      }
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (ch === "(") depth++;
      else if (ch === ")") {
        depth--;
        if (depth === 0) return j;
      }
      j++;
    }
    throw new ShellSyntaxError("unexpected end of input while looking for ')'");
  };

  const findClosingBrace = (start: number): number => {
    let j = start;
    let quote: string | null = null;
    while (j < line.length) {
      const ch = line[j];
      if (quote) {
        if (ch === quote) quote = null;
        j++;
        continue;
      }
      if (ch === "'" || ch === '"') quote = ch;
      else if (ch === "}") return j;
      j++;
    }
    throw new ShellSyntaxError("unexpected end of input while looking for '}'");
  };

  const parseDollar = (index: number, quoted: boolean): number => {
    const next = line[index + 1];
    if (next === "(") {
      if (line[index + 2] === "(") {
        // $(( arithmetic ))
        let depth = 1;
        let j = index + 3;
        let content = "";
        while (j < line.length) {
          const ch = line[j];
          if (ch === "(") depth++;
          else if (ch === ")") {
            if (depth === 1 && line[j + 1] === ")") break;
            depth--;
          }
          content += ch;
          j++;
        }
        if (j >= line.length) throw new ShellSyntaxError("unexpected end of input in arithmetic expansion");
        parts.push({ type: "arith", source: content, quoted });
        active = true;
        return j + 2;
      }
      const close = findClosingParen(index + 2);
      parts.push({ type: "command", source: line.slice(index + 2, close), quoted });
      active = true;
      return close + 1;
    }

    if (next === "{") {
      const close = findClosingBrace(index + 2);
      const content = line.slice(index + 2, close);
      let length = false;
      let body = content;
      if (body.startsWith("#") && body.length > 1) {
        length = true;
        body = body.slice(1);
      }
      const operator = /^([A-Za-z_][A-Za-z0-9_]*|\d+|[@*#?$!-])(:?[-+=?])(.*)$/.exec(body);
      if (operator) {
        parts.push({
          type: "variable",
          name: operator[1],
          op: operator[2] as ":-" | ":=" | ":+" | "-" | "=" | "+",
          arg: operator[3],
          quoted,
          length,
        });
      } else if (/^([A-Za-z_][A-Za-z0-9_]*|\d+|[@*#?$!-])$/.test(body)) {
        parts.push({ type: "variable", name: body, quoted, length });
      } else {
        throw new ShellSyntaxError(`bad substitution: ${content}`);
      }
      active = true;
      return close + 1;
    }

    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(line.slice(index + 1));
    if (name) {
      parts.push({ type: "variable", name: name[0], quoted });
      active = true;
      return index + 1 + name[0].length;
    }
    if (next !== undefined && "?$!#@*-0123456789".indexOf(next) >= 0) {
      parts.push({ type: "variable", name: next, quoted });
      active = true;
      return index + 2;
    }
    appendLiteral("$", quoted);
    return index + 1;
  };

  const parseBacktick = (index: number, quoted: boolean): number => {
    let j = index + 1;
    let source = "";
    while (j < line.length && line[j] !== "`") {
      if (line[j] === "\\" && j + 1 < line.length) {
        const next = line[j + 1];
        if (next === "`" || next === "\\" || next === "$") {
          source += next;
          j += 2;
          continue;
        }
      }
      source += line[j++];
    }
    if (j >= line.length) throw new ShellSyntaxError("unexpected end of input while looking for '`'");
    parts.push({ type: "command", source, quoted });
    active = true;
    return j + 1;
  };

  const parseOperator = (): void => {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === "&") {
      if (next === "&") {
        pushOp("&&");
        i += 2;
        return;
      }
      if (next === ">") {
        if (line[i + 2] === ">") {
          pushOp("&>>");
          i += 3;
        } else {
          pushOp("&>");
          i += 2;
        }
        return;
      }
      pushOp("&");
      i++;
      return;
    }

    if (ch === "|") {
      if (next === "|") {
        pushOp("||");
        i += 2;
      } else {
        pushOp("|");
        i++;
      }
      return;
    }

    if (ch === ";") {
      pushOp(";");
      i++;
      return;
    }

    // < and >
    const fdPrefix = wordIsFd();
    let fd = ch === "<" ? "0" : "1";
    if (fdPrefix !== null) {
      fd = fdPrefix;
      parts = [];
      active = false;
      glob = false;
      wordQuoted = false;
    }

    if (ch === "<") {
      if (next === "<") {
        pushOp("<<");
        i += 2;
        return;
      }
      pushOp("<");
      i++;
      return;
    }

    // ch === ">"
    if (next === ">" ) {
      pushOp(fd === "1" ? ">>" : `${fd}>>`);
      i += 2;
      return;
    }
    if (next === "&" && line[i + 2] !== undefined && /[0-9]/.test(line[i + 2])) {
      pushOp(`${fd}>&${line[i + 2]}`);
      i += 3;
      return;
    }
    pushOp(fd === "1" ? ">" : `${fd}>`);
    i++;
  };

  while (i < line.length) {
    const ch = line[i];

    if (ch === " " || ch === "\t" || ch === "\r") {
      flush();
      i++;
      continue;
    }

    if (ch === "\n") {
      flush();
      tokens.push({ kind: "op", value: ";" });
      i++;
      continue;
    }

    if (ch === "#" && !active) {
      break;
    }

    if (ch === "\\") {
      const next = line[i + 1];
      if (next === undefined) {
        appendLiteral("\\", false);
        i++;
      } else if (next === "\n") {
        i += 2;
      } else {
        appendLiteral(next, true);
        i += 2;
      }
      continue;
    }

    if (ch === "'") {
      appendLiteral("", true);
      const end = line.indexOf("'", i + 1);
      if (end < 0) throw new ShellSyntaxError("unexpected end of input while looking for \"'\"");
      appendLiteral(line.slice(i + 1, end), true);
      i = end + 1;
      continue;
    }

    if (ch === '"') {
      appendLiteral("", true);
      i++;
      let closed = false;
      while (i < line.length) {
        const c = line[i];
        if (c === '"') {
          closed = true;
          i++;
          break;
        }
        if (c === "\\") {
          const next = line[i + 1];
          if (next === "$" || next === "`" || next === '"' || next === "\\") {
            appendLiteral(next, true);
            i += 2;
          } else if (next === "\n") {
            i += 2;
          } else {
            appendLiteral("\\", true);
            i++;
          }
          continue;
        }
        if (c === "$") {
          i = parseDollar(i, true);
          continue;
        }
        if (c === "`") {
          i = parseBacktick(i, true);
          continue;
        }
        appendLiteral(c, true);
        i++;
      }
      if (!closed) throw new ShellSyntaxError('unexpected end of input while looking for \'"\'');
      continue;
    }

    if (ch === "$") {
      i = parseDollar(i, false);
      continue;
    }

    if (ch === "`") {
      i = parseBacktick(i, false);
      continue;
    }

    if ("|&;<>".indexOf(ch) >= 0) {
      parseOperator();
      continue;
    }

    if (parts.length === 0 && !active && ch === "~") {
      tilde = true;
    }
    if ("*?[".indexOf(ch) >= 0) glob = true;
    appendLiteral(ch, false);
    i++;
  }

  flush();
  return tokens;
}

// ---------------------------------------------------------------------------
// Parsed command structures
// ---------------------------------------------------------------------------

interface Redirection {
  fd: number;
  op: "write" | "append" | "read" | "dup" | "both";
  target?: WordToken;
  dupFd?: number;
}

interface SimpleCommand {
  words: WordToken[];
  redirects: Redirection[];
}

interface Pipeline {
  commands: SimpleCommand[];
  background: boolean;
}

type Connector = ";" | "&&" | "||" | null;

interface SequenceItem {
  pipeline: Pipeline;
  connector: Connector;
}

function parseSequence(tokens: Token[]): SequenceItem[] {
  let index = 0;
  const items: SequenceItem[] = [];
  let connector: Connector = null;

  const peek = (): Token | undefined => tokens[index];

  const parseWord = (): WordToken => {
    const token = tokens[index];
    if (!token || token.kind !== "word") {
      throw new ShellSyntaxError("expected a redirection target");
    }
    index++;
    return token;
  };

  const parseRedirection = (op: string): Redirection => {
    if (op === "<") return { fd: 0, op: "read", target: parseWord() };
    if (op === "<<") throw new ShellSyntaxError("here-documents are not supported");
    if (op === ">") return { fd: 1, op: "write", target: parseWord() };
    if (op === ">>") return { fd: 1, op: "append", target: parseWord() };
    if (op === "2>") return { fd: 2, op: "write", target: parseWord() };
    if (op === "2>>") return { fd: 2, op: "append", target: parseWord() };
    if (op === "&>") return { fd: 1, op: "both", target: parseWord() };
    if (op === "&>>") return { fd: 1, op: "both", target: parseWord() };
    if (/^[12]>&[12]$/.test(op)) {
      const match = /^([12])>&([12])$/.exec(op) as RegExpExecArray;
      return { fd: parseInt(match[1], 10), op: "dup", dupFd: parseInt(match[2], 10) };
    }
    throw new ShellSyntaxError(`unexpected operator '${op}'`);
  };

  const parseSimple = (): SimpleCommand => {
    const words: WordToken[] = [];
    const redirects: Redirection[] = [];
    while (index < tokens.length) {
      const token = tokens[index];
      if (token.kind === "word") {
        words.push(token);
        index++;
        continue;
      }
      if (token.value === "|" || token.value === "&&" || token.value === "||" || token.value === ";" || token.value === "&") {
        break;
      }
      if (
        token.value === "<" ||
        token.value === "<<" ||
        token.value === ">" ||
        token.value === ">>" ||
        token.value === "2>" ||
        token.value === "2>>" ||
        token.value === "&>" ||
        token.value === "&>>" ||
        /^[12]>&[12]$/.test(token.value)
      ) {
        const op = token.value;
        index++;
        redirects.push(parseRedirection(op));
        continue;
      }
      throw new ShellSyntaxError(`unexpected token '${token.value}'`);
    }
    if (words.length === 0 && redirects.length === 0) {
      throw new ShellSyntaxError("unexpected end of command");
    }
    return { words, redirects };
  };

  const parsePipeline = (): Pipeline => {
    const commands = [parseSimple()];
    while (peek() && peek()!.kind === "op" && (peek() as OpToken).value === "|") {
      index++;
      const next = peek();
      if (
        !next ||
        (next.kind === "op" &&
          ["|", "&&", "||", ";", "&"].indexOf(next.value) >= 0)
      ) {
        throw new ShellSyntaxError("unexpected end of pipeline");
      }
      commands.push(parseSimple());
    }
    return { commands, background: false };
  };

  while (index < tokens.length) {
    const pipeline = parsePipeline();
    items.push({ pipeline, connector });
    connector = null;
    const next = peek();
    if (!next) break;
    if (next.kind !== "op") throw new ShellSyntaxError(`unexpected word '${next.parts.map((p) => (p.type === "literal" ? p.value : "")).join("")}'`);
    const op = next.value;
    if (op === "&&" || op === "||" || op === ";") {
      connector = op;
      index++;
      continue;
    }
    if (op === "&") {
      pipeline.background = true;
      connector = ";";
      index++;
      continue;
    }
    throw new ShellSyntaxError(`unexpected operator '${op}'`);
  }
  return items;
}

// ---------------------------------------------------------------------------
// Expansion helpers
// ---------------------------------------------------------------------------

type Sink =
  | { type: "pipe" }
  | { type: "stderr" }
  | { type: "file"; node: FsNode; path: string };

interface ExpandedField {
  text: string;
  exists: boolean;
}

function isSeparator(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n";
}

function globSegmentToRegExp(segment: string): RegExp {
  let source = "^";
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === "*") source += "[^/]*";
    else if (ch === "?") source += "[^/]";
    else if (ch === "[") {
      const end = segment.indexOf("]", i + 1);
      if (end < 0) source += "\\[";
      else {
        let inner = segment.slice(i + 1, end);
        if (inner.startsWith("!")) inner = "^" + inner.slice(1);
        source += "[" + inner.replace(/\\/g, "\\\\") + "]";
        i = end;
      }
    } else if ("\\^$+.|(){}".indexOf(ch) >= 0) source += "\\" + ch;
    else source += ch;
  }
  return new RegExp(source + "$");
}

function splitAlias(value: string): string[] {
  const words: string[] = [];
  let current = "";
  let quote: string | null = null;
  let active = false;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      active = true;
      continue;
    }
    if (ch === "\\" && i + 1 < value.length) {
      current += value[++i];
      active = true;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (active) {
        words.push(current);
        current = "";
        active = false;
      }
      continue;
    }
    current += ch;
    active = true;
  }
  if (active) words.push(current);
  return words;
}

function isAssignment(word: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(word);
}

// ---------------------------------------------------------------------------
// Arithmetic
// ---------------------------------------------------------------------------

function evalArithmetic(expression: string, resolve: (name: string) => string): number {
  type ArithToken = { type: "number" | "ident" | "op"; value: string };
  const tokens: ArithToken[] = [];
  let i = 0;
  while (i < expression.length) {
    const ch = expression[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const numberMatch = /^(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?)/.exec(expression.slice(i));
    if (numberMatch) {
      tokens.push({ type: "number", value: numberMatch[0] });
      i += numberMatch[0].length;
      continue;
    }
    const identMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(expression.slice(i));
    if (identMatch) {
      tokens.push({ type: "ident", value: identMatch[0] });
      i += identMatch[0].length;
      continue;
    }
    const op = ["<<", ">>", "<=", ">=", "==", "!=", "&&", "||", "+", "-", "*", "/", "%", "(", ")", "<", ">", "!", "~", "&", "|", "^"].find((candidate) =>
      expression.startsWith(candidate, i),
    );
    if (!op) throw new Error(`invalid arithmetic expression near '${expression.slice(i)}'`);
    tokens.push({ type: "op", value: op });
    i += op.length;
  }

  let position = 0;
  const peek = (): ArithToken | undefined => tokens[position];
  const takeOp = (value: string): boolean => {
    const token = peek();
    if (token && token.type === "op" && token.value === value) {
      position++;
      return true;
    }
    return false;
  };

  const parsePrimary = (): number => {
    const token = peek();
    if (!token) throw new Error("unexpected end of arithmetic expression");
    if (token.type === "number") {
      position++;
      return token.value.startsWith("0x") || token.value.startsWith("0X")
        ? parseInt(token.value, 16)
        : parseFloat(token.value);
    }
    if (token.type === "ident") {
      position++;
      return parseInt(resolve(token.value), 10) || 0;
    }
    if (takeOp("(")) {
      const value = parseTernary();
      if (!takeOp(")")) throw new Error("missing ')' in arithmetic expression");
      return value;
    }
    throw new Error(`unexpected token '${token.value}' in arithmetic expression`);
  };

  const parseUnary = (): number => {
    if (takeOp("-")) return -parseUnary();
    if (takeOp("+")) return +parseUnary();
    if (takeOp("!")) return parseUnary() === 0 ? 1 : 0;
    if (takeOp("~")) return ~parseUnary();
    return parsePrimary();
  };

  const parseMul = (): number => {
    let value = parseUnary();
    for (;;) {
      if (takeOp("*")) value *= parseUnary();
      else if (takeOp("/")) {
        const right = parseUnary();
        if (right === 0) throw new Error("division by zero");
        value = Math.trunc(value / right);
      } else if (takeOp("%")) {
        const right = parseUnary();
        if (right === 0) throw new Error("division by zero");
        value %= right;
      } else break;
    }
    return value;
  };

  const parseAdd = (): number => {
    let value = parseMul();
    for (;;) {
      if (takeOp("+")) value += parseMul();
      else if (takeOp("-")) value -= parseMul();
      else break;
    }
    return value;
  };

  const parseShift = (): number => {
    let value = parseAdd();
    for (;;) {
      if (takeOp("<<")) value <<= parseAdd();
      else if (takeOp(">>")) value >>= parseAdd();
      else break;
    }
    return value;
  };

  const parseRelational = (): number => {
    let value = parseShift();
    for (;;) {
      if (takeOp("<=")) value = value <= parseShift() ? 1 : 0;
      else if (takeOp(">=")) value = value >= parseShift() ? 1 : 0;
      else if (takeOp("<")) value = value < parseShift() ? 1 : 0;
      else if (takeOp(">")) value = value > parseShift() ? 1 : 0;
      else break;
    }
    return value;
  };

  const parseEquality = (): number => {
    let value = parseRelational();
    for (;;) {
      if (takeOp("==")) value = value === parseRelational() ? 1 : 0;
      else if (takeOp("!=")) value = value !== parseRelational() ? 1 : 0;
      else break;
    }
    return value;
  };

  const parseBitAnd = (): number => {
    let value = parseEquality();
    while (takeOp("&")) value &= parseEquality();
    return value;
  };

  const parseBitXor = (): number => {
    let value = parseBitAnd();
    while (takeOp("^")) value ^= parseBitAnd();
    return value;
  };

  const parseBitOr = (): number => {
    let value = parseBitXor();
    while (takeOp("|")) value |= parseBitXor();
    return value;
  };

  const parseAnd = (): number => {
    let value = parseBitOr();
    while (takeOp("&&")) {
      const right = parseBitOr();
      value = value !== 0 && right !== 0 ? 1 : 0;
    }
    return value;
  };

  const parseOr = (): number => {
    let value = parseAnd();
    while (takeOp("||")) {
      const right = parseAnd();
      value = value !== 0 || right !== 0 ? 1 : 0;
    }
    return value;
  };

  const parseTernary = (): number => {
    const condition = parseOr();
    if (takeOp("?")) {
      const yes = parseTernary();
      if (!takeOp(":")) throw new Error("missing ':' in arithmetic expression");
      const no = parseTernary();
      return condition !== 0 ? yes : no;
    }
    return condition;
  };

  const result = parseTernary();
  if (position !== tokens.length) throw new Error("trailing characters in arithmetic expression");
  return result;
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

export interface ShellOptions {
  env?: Record<string, string>;
  cwd?: string;
  cwdDisplay?: string;
  history?: string[];
  aliases?: Map<string, string>;
  pid?: number;
  lastCode?: number;
}

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  code: number;
  clear?: boolean;
  exit?: boolean;
}

const DEFAULT_PATH = "/usr/local/bin:/usr/bin:/bin";

export class Shell implements ShellHandle {
  readonly fs: FileSystem;
  env: Record<string, string>;
  cwd: string;
  cwdDisplay: string;
  history: string[];
  aliases: Map<string, string>;
  exited = false;
  lastCode = 0;
  readonly pid: number;

  constructor(fs?: FileSystem, options: ShellOptions = {}) {
    if (fs) {
      this.fs = fs;
    } else {
      this.fs = new FileSystem(buildDefaultFileSystem);
      installBinaries(this.fs, COMMAND_NAMES);
    }

    this.pid = options.pid ?? 2041;
    this.lastCode = options.lastCode ?? 0;
    this.cwd = options.cwd ?? (this.fs.exists(HOME, "/") ? HOME : "/");
    this.cwdDisplay = options.cwdDisplay ?? this.cwd;
    this.history = options.history ?? [];
    this.aliases =
      options.aliases ??
      new Map<string, string>([
        ["ll", "ls -la"],
        ["la", "ls -A"],
        ["l", "ls -CF"],
        ["..", "cd .."],
        ["...", "cd ../.."],
        ["gs", "git status"],
        ["gd", "git diff"],
      ]);
    this.env = {
      HOME,
      USER,
      LOGNAME: USER,
      UID: "1000",
      SHELL: "/bin/bash",
      PATH: DEFAULT_PATH,
      PWD: this.cwdDisplay,
      OLDPWD: this.cwdDisplay,
      HOSTNAME,
      TERM: "xterm-256color",
      LANG: "en_US.UTF-8",
      LC_ALL: "en_US.UTF-8",
      EDITOR: "nvim",
      PAGER: "less",
      HISTSIZE: "500",
      HISTCONTROL: "ignoreboth",
      ...(options.env ?? {}),
    };
  }

  setCwd(physical: string, display: string): void {
    this.cwd = physical;
    this.cwdDisplay = display;
    this.env.PWD = display;
  }

  exit(code: number): void {
    this.exited = true;
    this.lastCode = code;
  }

  /** Path for the prompt, with $HOME shortened to ~. */
  getPromptPath(): string {
    const home = this.env.HOME ?? HOME;
    if (this.cwdDisplay === home) return "~";
    if (this.cwdDisplay.startsWith(home + "/")) {
      return "~" + this.cwdDisplay.slice(home.length);
    }
    return this.cwdDisplay;
  }

  execute(line: string, options: { recordHistory?: boolean } = {}): ExecuteResult {
    const trimmed = line.trim();
    if (trimmed === "") {
      return { stdout: "", stderr: "", code: this.lastCode };
    }

    if (options.recordHistory !== false) {
      const histControl = this.env.HISTCONTROL ?? "";
      const ignoresSpace = histControl.indexOf("ignorespace") >= 0 || histControl.indexOf("ignoreboth") >= 0;
      const ignoreDups = histControl.indexOf("ignoredups") >= 0 || histControl.indexOf("ignoreboth") >= 0;
      const last = this.history[this.history.length - 1];
      if (!(ignoresSpace && line.startsWith(" ")) && !(ignoreDups && last === line)) {
        this.history.push(line);
        const limit = parseInt(this.env.HISTSIZE ?? "500", 10);
        if (!Number.isNaN(limit) && limit > 0 && this.history.length > limit) {
          this.history.splice(0, this.history.length - limit);
        }
      }
    }

    let result: ExecuteResult;
    try {
      const tokens = tokenize(line);
      const items = parseSequence(tokens);
      result = this.runSequence(items);
    } catch (error) {
      if (error instanceof ShellSyntaxError) {
        result = { stdout: "", stderr: `sh: syntax error: ${error.message}\n`, code: 2 };
      } else {
        result = {
          stdout: "",
          stderr: `sh: ${error instanceof Error ? error.message : String(error)}\n`,
          code: 2,
        };
      }
    }

    this.lastCode = result.code;
    return result;
  }

  private runSequence(items: SequenceItem[]): ExecuteResult {
    let stdout = "";
    let stderr = "";
    let code = this.lastCode;
    let clear = false;
    let exit = false;

    for (const item of items) {
      // `$?` must see the status of the previous command in this same line.
      this.lastCode = code;
      const skip =
        (item.connector === "&&" && code !== 0) ||
        (item.connector === "||" && code === 0);
      if (skip) continue;
      const result = this.runPipeline(item.pipeline);
      stdout += result.stdout;
      stderr += result.stderr;
      code = result.code;
      if (result.clear) clear = true;
      if (result.exit) {
        exit = true;
        break;
      }
    }
    return { stdout, stderr, code, clear, exit };
  }

  private runPipeline(pipeline: Pipeline): ExecuteResult {
    let stdin = "";
    let stdout = "";
    let stderr = "";
    let code = 0;
    let clear = false;
    let exit = false;

    for (let i = 0; i < pipeline.commands.length; i++) {
      const last = i === pipeline.commands.length - 1;
      const result = this.runSimple(pipeline.commands[i], stdin, last);
      stderr += result.stderr;
      stdout = result.stdout;
      stdin = result.stdout;
      code = result.code;
      if (result.clear) clear = true;
      if (result.exit) {
        exit = true;
        break;
      }
    }
    return { stdout, stderr, code, clear, exit };
  }

  private runSimple(command: SimpleCommand, stdin: string, isLast: boolean): ExecuteResult {
    // 1. Expand words. Assignment words split and glob differently from
    // ordinary arguments (POSIX: no field splitting, no pathname expansion).
    let argv: string[] = [];
    for (const word of command.words) {
      argv = argv.concat(
        this.isAssignmentWord(word)
          ? [this.expandAssignmentWord(word)]
          : this.expandWord(word),
      );
    }

    // 2. Expand redirections and prepare sinks.
    let input = stdin;
    let outSink: Sink = { type: "pipe" };
    let errSink: Sink = { type: "stderr" };
    try {
      for (const redirect of command.redirects) {
        if (redirect.op === "read" || redirect.op === "write" || redirect.op === "append" || redirect.op === "both") {
          const targetWords = this.expandWord(redirect.target as WordToken);
          if (targetWords.length !== 1) {
            return { stdout: "", stderr: `${this.commandName(argv)}: ambiguous redirect\n`, code: 1 };
          }
          const target = targetWords[0];
          if (redirect.op === "read") {
            input = this.fs.readFile(target, this.cwd).content;
            continue;
          }
          const append = redirect.op === "append" || redirect.op === "both" ? redirect.op === "both" ? false : true : false;
          const written = this.fs.writeFile(target, this.cwd, "", { append });
          const sink: Sink = { type: "file", node: written.node, path: written.path };
          if (redirect.op === "both") {
            outSink = sink;
            errSink = sink;
          } else if (redirect.fd === 2) {
            errSink = sink;
          } else {
            outSink = sink;
          }
        } else if (redirect.op === "dup") {
          if (redirect.fd === 2 && redirect.dupFd === 1) errSink = outSink;
          else if (redirect.fd === 1 && redirect.dupFd === 2) outSink = errSink;
        }
      }
    } catch (error) {
      const message = error instanceof FsError ? STRERROR[error.code] : error instanceof Error ? error.message : String(error);
      return { stdout: "", stderr: `sh: ${message}\n`, code: 1 };
    }

    // 3. Leading VAR=value assignments.
    const assignments: Record<string, string> = {};
    while (argv.length > 0 && isAssignment(argv[0])) {
      const word = argv.shift() as string;
      const eq = word.indexOf("=");
      assignments[word.slice(0, eq)] = word.slice(eq + 1);
    }

    if (argv.length === 0) {
      for (const key of Object.keys(assignments)) this.env[key] = assignments[key];
      return { stdout: "", stderr: "", code: 0 };
    }

    // 4. Alias expansion.
    argv = this.expandAliases(argv);

    const name = argv[0];
    const spec = COMMANDS[name];
    if (!spec) {
      return { stdout: "", stderr: `sh: ${name}: command not found\n`, code: 127 };
    }

    this.env.PWD = this.cwdDisplay;

    // Commands share the live environment so `export`/`unset` persist. A
    // leading `VAR=value` is layered on for just this command, then restored.
    const saved: Record<string, string | undefined> = {};
    for (const key of Object.keys(assignments)) {
      saved[key] = this.env[key];
      this.env[key] = assignments[key];
    }

    const context: ExecContext = {
      name,
      argv,
      args: argv.slice(1),
      stdin: input,
      env: this.env,
      fs: this.fs,
      shell: this,
      tty: isLast && outSink.type === "pipe",
    };

    let result: ExecResult;
    try {
      result = spec.run(context);
    } catch (error) {
      if (error instanceof FsError) {
        result = { stderr: `${name}: ${error.path}: ${STRERROR[error.code]}\n`, code: 1 };
      } else {
        result = {
          stderr: `${name}: ${error instanceof Error ? error.message : String(error)}\n`,
          code: 1,
        };
      }
    } finally {
      for (const key of Object.keys(assignments)) {
        if (saved[key] === undefined) delete this.env[key];
        else this.env[key] = saved[key] as string;
      }
    }

    const output = result.stdout ?? "";
    const errorOutput = result.stderr ?? "";

    // 5. Route streams.
    let capturedOut = "";
    let capturedErr = "";
    if (outSink.type === "pipe") capturedOut = output;
    else if (outSink.type === "file") writeToSink(outSink, output);
    if (errSink === outSink) {
      if (errSink.type === "file") writeToSink(errSink, errorOutput);
      else if (errSink.type === "stderr") capturedErr += errorOutput;
      else if (errSink.type === "pipe") capturedOut += errorOutput;
    } else if (errSink.type === "stderr") {
      capturedErr = errorOutput;
    } else if (errSink.type === "file") {
      writeToSink(errSink, errorOutput);
    }

    return {
      stdout: capturedOut,
      stderr: capturedErr,
      code: result.code ?? 0,
      clear: result.clear,
      exit: result.exit,
    };
  }

  private commandName(argv: string[]): string {
    return argv.length > 0 ? argv[0] : "sh";
  }

  private expandAliases(argv: string[]): string[] {
    let result = argv.slice();
    const seen: string[] = [];
    for (let depth = 0; depth < 16; depth++) {
      const alias = this.aliases.get(result[0]);
      if (alias === undefined) break;
      if (seen.indexOf(result[0]) >= 0) break;
      seen.push(result[0]);
      const replacement = splitAlias(alias);
      result = replacement.concat(result.slice(1));
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Expansion
  // -------------------------------------------------------------------------

  private isAssignmentWord(word: WordToken): boolean {
    const first = word.parts[0];
    return (
      first !== undefined &&
      first.type === "literal" &&
      !first.quoted &&
      /^[A-Za-z_][A-Za-z0-9_]*=/.test(first.value)
    );
  }

  private expandAssignmentWord(word: WordToken): string {
    let value = this.expandParts(word.parts, true).join("");
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(value);
    if (match && match[2].startsWith("~")) {
      value = match[1] + "=" + this.expandTilde(match[2]);
    }
    return value;
  }

  expandWord(word: WordToken): string[] {
    const fields = this.expandParts(word.parts);
    if (word.tilde && fields.length > 0) {
      fields[0] = this.expandTilde(fields[0]);
    }
    if (word.glob) {
      let expanded: string[] = [];
      for (const field of fields) {
        if (!/[*?[]/.test(field)) {
          expanded.push(field);
          continue;
        }
        const matches = this.glob(field);
        if (matches.length === 0) expanded.push(field);
        else expanded = expanded.concat(matches);
      }
      return expanded;
    }
    return fields;
  }

  private expandTilde(text: string): string {
    const home = this.env.HOME ?? HOME;
    if (text === "~") return home;
    if (text.startsWith("~/")) return home + text.slice(1);
    return text;
  }

  private expandParts(parts: WordPart[], noSplit = false): string[] {
    const fields: ExpandedField[] = [{ text: "", exists: false }];

    const appendQuoted = (value: string): void => {
      const field = fields[fields.length - 1];
      field.text += value;
      field.exists = true;
    };

    const appendUnquoted = (value: string): void => {
      let index = 0;
      while (index < value.length) {
        let sawSeparator = false;
        while (index < value.length && isSeparator(value[index])) {
          sawSeparator = true;
          index++;
        }
        const current = fields[fields.length - 1];
        if (sawSeparator && current.exists) {
          fields.push({ text: "", exists: false });
        }
        if (index >= value.length) break;
        const start = index;
        while (index < value.length && !isSeparator(value[index])) index++;
        const field = fields[fields.length - 1];
        field.text += value.slice(start, index);
        field.exists = true;
      }
    };

    for (const part of parts) {
      if (part.type === "literal") {
        if (part.quoted) appendQuoted(part.value);
        else if (part.value !== "") {
          const field = fields[fields.length - 1];
          field.text += part.value;
          field.exists = true;
        } else {
          // An unquoted empty literal only matters when the word is otherwise
          // empty, and then the word disappears.
          void part;
        }
        continue;
      }

      if (part.type === "variable") {
        const value = this.expandVariable(part);
        if (part.quoted || noSplit) appendQuoted(value);
        else appendUnquoted(value);
        continue;
      }

      if (part.type === "command") {
        const value = this.commandSubstitution(part.source);
        if (part.quoted || noSplit) appendQuoted(value);
        else appendUnquoted(value);
        continue;
      }

      if (part.type === "arith") {
        let value: string;
        try {
          value = String(evalArithmetic(part.source, (name) => this.env[name] ?? "0"));
        } catch (error) {
          value = "";
          void error;
        }
        if (part.quoted || noSplit) appendQuoted(value);
        else appendUnquoted(value);
      }
    }

    return fields.filter((field) => field.exists).map((field) => field.text);
  }

  private expandVariable(part: Extract<WordPart, { type: "variable" }>): string {
    const current = this.getParameter(part.name);
    if (part.length) return String(Array.from(current).length);

    if (part.op) {
      const unset = current === "";
      if (part.op === ":-" && unset) return this.expandArgument(part.arg ?? "");
      if (part.op === "-" && this.env[part.name] === undefined) return this.expandArgument(part.arg ?? "");
      if (part.op === ":=" && unset) {
        const value = this.expandArgument(part.arg ?? "");
        this.env[part.name] = value;
        return value;
      }
      if (part.op === "=" && this.env[part.name] === undefined) {
        const value = this.expandArgument(part.arg ?? "");
        this.env[part.name] = value;
        return value;
      }
      if (part.op === ":+" && !unset) return this.expandArgument(part.arg ?? "");
      if (part.op === "+" && this.env[part.name] !== undefined) return this.expandArgument(part.arg ?? "");
    }
    return current;
  }

  private getParameter(name: string): string {
    switch (name) {
      case "?":
        return String(this.lastCode);
      case "$":
        return String(this.pid);
      case "!":
        return String(this.pid + 1);
      case "#":
        return "0";
      case "@":
      case "*":
        return "";
      case "0":
        return "bash";
      case "-":
        return "himBH";
      default:
        if (/^[1-9]$/.test(name)) return "";
        return this.env[name] ?? "";
    }
  }

  private expandArgument(text: string): string {
    try {
      const tokens = tokenize(text);
      if (tokens.length === 1 && tokens[0].kind === "word") {
        return this.expandWord(tokens[0]).join(" ");
      }
    } catch {
      // fall through to the raw text
    }
    return text;
  }

  private commandSubstitution(source: string): string {
    const subshell = new Shell(this.fs, {
      env: { ...this.env },
      cwd: this.cwd,
      cwdDisplay: this.cwdDisplay,
      history: this.history.slice(),
      aliases: new Map(this.aliases),
      pid: this.pid,
      lastCode: this.lastCode,
    });
    const result = subshell.execute(source, { recordHistory: false });
    return result.stdout.replace(/\n+$/, "");
  }

  private glob(pattern: string): string[] {
    const absolute = pattern.startsWith("/");
    const segments = pattern.split("/").filter((segment) => segment.length > 0);
    let candidates: { path: string; node: FsNode }[] = [];

    try {
      const start = this.fs.resolve(absolute ? "/" : this.cwd, "/");
      candidates = [{ path: start.path, node: start.node }];
    } catch {
      return [];
    }

    for (const segment of segments) {
      const literal = !/[*?[]/.test(segment);
      const matcher = literal ? null : globSegmentToRegExp(segment);
      const next: { path: string; node: FsNode }[] = [];
      for (const candidate of candidates) {
        if (!candidate.node.isDirectory()) continue;
        if (literal) {
          try {
            const resolved = this.fs.resolve(joinPath(candidate.path, segment), "/");
            next.push({ path: resolved.path, node: resolved.node });
          } catch {
            // no match
          }
          continue;
        }
        let names: string[];
        try {
          names = this.fs.list(candidate.node, segment.startsWith("."));
        } catch {
          continue;
        }
        for (const name of names) {
          if (name.startsWith(".") && !segment.startsWith(".")) continue;
          if (!matcher!.test(name)) continue;
          try {
            const resolved = this.fs.resolve(joinPath(candidate.path, name), "/");
            next.push({ path: resolved.path, node: resolved.node });
          } catch {
            // skip broken links
          }
        }
      }
      candidates = next;
      if (candidates.length === 0) break;
      if (candidates.length > 512) candidates = candidates.slice(0, 512);
    }

    return candidates
      .map((candidate) => this.displayPath(candidate.path, pattern))
      .sort((a, b) => a.localeCompare(b, "en"));
  }

  private displayPath(physical: string, pattern: string): string {
    if (pattern.startsWith("/")) return physical;
    if (physical === this.cwd) return ".";
    const prefix = this.cwd === "/" ? "/" : this.cwd + "/";
    if (physical.startsWith(prefix)) {
      const relative = physical.slice(prefix.length);
      return pattern.startsWith("./") ? "./" + relative : relative;
    }
    const base = this.cwd.split("/").filter(Boolean);
    const target = physical.split("/").filter(Boolean);
    let common = 0;
    while (common < base.length && common < target.length && base[common] === target[common]) {
      common++;
    }
    return "../".repeat(base.length - common) + target.slice(common).join("/");
  }
}

function writeToSink(sink: Extract<Sink, { type: "file" }>, text: string): void {
  if (text === "") return;
  if (sink.node.special === "null") return;
  sink.node.content += text;
  sink.node.mtime = new Date();
  sink.node.atime = new Date();
}

export { splitAlias };
