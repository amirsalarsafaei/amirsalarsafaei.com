// POSIX-ish command implementations. A command is a pure-ish function over a
// ShellHandle: it reads `ctx.stdin`, writes stdout/stderr and returns a status.

import { say } from "cowsay";
import {
  FileSystem,
  FsError,
  FsNode,
  STRERROR,
  basename,
  dirname,
  formatMode,
  joinPath,
  normalizeLogical,
  parseOctalMode,
} from "./fs";
import { HOME, HOSTNAME, UID, USER } from "./defaultFileSystem";

export interface ShellHandle {
  fs: FileSystem;
  env: Record<string, string>;
  /** Physical cwd (symlinks resolved). */
  cwd: string;
  /** Logical cwd used by `pwd` and the prompt. */
  cwdDisplay: string;
  history: string[];
  aliases: Map<string, string>;
  exited: boolean;
  lastCode: number;
  setCwd(physical: string, display: string): void;
  exit(code: number): void;
  execute(
    line: string,
    options?: { recordHistory?: boolean },
  ): { stdout: string; stderr: string; code: number };
}

export interface ExecResult {
  stdout?: string;
  stderr?: string;
  code?: number;
  clear?: boolean;
  exit?: boolean;
}

export interface ExecContext {
  name: string;
  argv: string[];
  args: string[];
  stdin: string;
  env: Record<string, string>;
  fs: FileSystem;
  shell: ShellHandle;
  /** True when stdout is the terminal (used for colourisation). */
  tty: boolean;
}

export interface CommandSpec {
  name: string;
  summary: string;
  usage: string;
  flags?: string[];
  builtin?: boolean;
  hidden?: boolean;
  run(ctx: ExecContext): ExecResult;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

export const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

export function paint(ctx: ExecContext, color: string, text: string): string {
  return ctx.tty ? color + text + C.reset : text;
}

function ok(stdout = "", code = 0): ExecResult {
  return { stdout, code };
}

function err(ctx: ExecContext, message: string, code = 1): ExecResult {
  return { stderr: `${ctx.name}: ${message}\n`, code };
}

function fail(message: string, code = 1): ExecResult {
  return { stderr: message, code };
}

function fsError(ctx: ExecContext, path: string, error: unknown, verb = ""): string {
  if (error instanceof FsError) {
    const prefix = verb ? `${verb}: ` : "";
    return `${ctx.name}: ${prefix}${path}: ${STRERROR[error.code]}\n`;
  }
  return `${ctx.name}: ${path}: ${error instanceof Error ? error.message : String(error)}\n`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function inputLines(ctx: ExecContext, files: string[]): { parts: string[]; errors: string; code: number; usedStdin: boolean } {
  const parts: string[] = [];
  let errors = "";
  let code = 0;
  let usedStdin = false;
  const list = files.length > 0 ? files : ["-"];
  for (const file of list) {
    if (file === "-") {
      parts.push(ctx.stdin);
      usedStdin = true;
      continue;
    }
    try {
      parts.push(ctx.fs.readFile(file, ctx.shell.cwd).content);
    } catch (error) {
      errors += fsError(ctx, file, error, "");
      code = 1;
    }
  }
  return { parts, errors, code, usedStdin };
}

interface ParsedArgs {
  flags: Set<string>;
  opts: Map<string, string>;
  operands: string[];
  error?: string;
}

function parseArgs(
  input: string[],
  spec: {
    shortBool?: string;
    shortValue?: string;
    longBool?: string[];
    longValue?: string[];
  } = {},
): ParsedArgs {
  const flags = new Set<string>();
  const opts = new Map<string, string>();
  const operands: string[] = [];
  const longBool = spec.longBool ?? [];
  const longValue = spec.longValue ?? [];
  const shortValue = spec.shortValue ?? "";
  const shortBool = spec.shortBool ?? "";
  let i = 0;
  let stop = false;

  while (i < input.length) {
    const arg = input[i];
    if (stop) {
      operands.push(arg);
      i++;
      continue;
    }
    if (arg === "--") {
      stop = true;
      i++;
      continue;
    }
    if (arg === "-") {
      operands.push(arg);
      i++;
      continue;
    }
    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const name = eq >= 0 ? arg.slice(2, eq) : arg.slice(2);
      if (longValue.indexOf(name) >= 0) {
        let value: string | undefined;
        if (eq >= 0) {
          value = arg.slice(eq + 1);
        } else {
          value = input[i + 1];
          i++;
        }
        if (value === undefined) {
          return { flags, opts, operands, error: `option '--${name}' requires an argument` };
        }
        opts.set(name, value);
      } else if (eq >= 0 && longBool.indexOf(name) >= 0) {
        opts.set(name, arg.slice(eq + 1));
        flags.add(name);
      } else if (longBool.indexOf(name) >= 0) {
        flags.add(name);
      } else {
        return { flags, opts, operands, error: `unrecognized option '--${name}'` };
      }
      i++;
      continue;
    }
    if (arg.startsWith("-") && arg.length > 1) {
      let consumed = false;
      for (let j = 1; j < arg.length; j++) {
        const ch = arg[j];
        if (shortValue.indexOf(ch) >= 0) {
          let value = arg.slice(j + 1);
          if (value === "") {
            value = input[i + 1];
            consumed = true;
            if (value === undefined) {
              return { flags, opts, operands, error: `option requires an argument -- '${ch}'` };
            }
          }
          opts.set(ch, value);
          break;
        }
        if (shortBool.indexOf(ch) < 0) {
          return { flags, opts, operands, error: `invalid option -- '${ch}'` };
        }
        flags.add(ch);
      }
      i++;
      if (consumed) i++;
      continue;
    }
    operands.push(arg);
    i++;
  }
  return { flags, opts, operands };
}

function optionError(ctx: ExecContext, parsed: ParsedArgs): ExecResult | null {
  if (!parsed.error) return null;
  return fail(`${ctx.name}: ${parsed.error}\nTry '${ctx.name} --help' for more information.\n`, 2);
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}`;
  const units = ["K", "M", "G", "T", "P"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}${units[unit]}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lsDate(date: Date): string {
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const month = MONTHS[date.getMonth()];
  const day = String(date.getDate()).padStart(2, " ");
  if (sameYear) {
    return `${month} ${day} ${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes(),
    ).padStart(2, "0")}`;
  }
  return `${month} ${day}  ${date.getFullYear()}`;
}

function userFor(uid: number): string {
  if (uid === 0) return "root";
  if (uid === UID) return USER;
  if (uid === 65534) return "nobody";
  return String(uid);
}

function groupFor(gid: number): string {
  if (gid === 0) return "root";
  if (gid === UID) return USER;
  if (gid === 1) return "wheel";
  if (gid === 4) return "adm";
  if (gid === 42) return "shadow";
  if (gid === 100) return "users";
  if (gid === 65534) return "nogroup";
  return String(gid);
}

function nameColor(ctx: ExecContext, node: FsNode): string {
  if (!ctx.tty) return "";
  if (node.isDirectory()) return C.bold + C.blue;
  if (node.isSymlink()) return C.cyan;
  if (node.mode & 0o111) return C.bold + C.green;
  return "";
}

function modeText(node: FsNode): string {
  return formatMode(node);
}

function shellPaths(ctx: ExecContext): string[] {
  return (ctx.env.PATH ?? "/usr/local/bin:/usr/bin:/bin").split(":").filter(Boolean);
}

function findCommandPath(ctx: ExecContext, name: string): string | null {
  if (name.indexOf("/") >= 0) {
    return ctx.fs.exists(name, ctx.shell.cwd) ? name : null;
  }
  for (const dir of shellPaths(ctx)) {
    const candidate = joinPath(dir, name);
    try {
      const resolved = ctx.fs.resolve(candidate, "/");
      if (resolved.node.isFile() && (resolved.node.mode & 0o111) !== 0) {
        return candidate;
      }
    } catch {
      // keep searching
    }
  }
  return null;
}

function patternToRegExp(pattern: string, extended: boolean): RegExp {
  // Both modes use JS regex syntax. Basic mode quotes the ERE-only operators
  // so `grep 'a+b'` means a literal plus, as POSIX BRE does.
  const source = extended ? pattern : pattern.replace(/([+?|(){}])/g, "\\$1");
  return new RegExp(source, "m");
}

function expandEscapes(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = text[++i];
    if (next === undefined) {
      out += "\\";
      break;
    }
    if (next === "c") break;
    if (next === "x") {
      const hex = text.slice(i + 1, i + 3);
      const match = /^[0-9a-fA-F]{1,2}/.exec(hex);
      if (match) {
        out += String.fromCharCode(parseInt(match[0], 16));
        i += match[0].length;
      } else {
        out += "\\x";
      }
      continue;
    }
    if (next >= "0" && next <= "7") {
      let oct = next;
      while (oct.length < 3 && text[i + 1] >= "0" && text[i + 1] <= "7") {
        oct += text[++i];
      }
      out += String.fromCharCode(parseInt(oct, 8));
      continue;
    }
    const table: Record<string, string> = {
      n: "\n",
      t: "\t",
      r: "\r",
      a: "\x07",
      b: "\b",
      f: "\f",
      v: "\v",
      e: "\x1b",
      "\\": "\\",
    };
    out += table[next] ?? next;
  }
  return out;
}

function splitRangeList(list: string, max: number): number[] {
  const out: number[] = [];
  for (const part of list.split(",")) {
    if (part === "") continue;
    const match = /^(\d+)(?:-(\d*))?$/.exec(part);
    if (!match) continue;
    const start = parseInt(match[1], 10);
    const end = match[2] === undefined ? start : match[2] === "" ? max : parseInt(match[2], 10);
    for (let i = start; i <= Math.min(end, max); i++) out.push(i);
  }
  return out;
}

const CLASS_SETS: Record<string, string[]> = {
  alpha: Array.from({ length: 52 }, (_, i) => String.fromCharCode(i < 26 ? 65 + i : 97 + i - 26)),
  digit: Array.from({ length: 10 }, (_, i) => String(i)),
  alnum: [],
  lower: Array.from({ length: 26 }, (_, i) => String.fromCharCode(97 + i)),
  upper: Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)),
  space: [" ", "\t", "\n", "\r", "\f", "\v"],
  punct: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".split(""),
};
CLASS_SETS.alnum = CLASS_SETS.alpha.concat(CLASS_SETS.digit);

function parseTrSet(spec: string, complement: boolean): Set<number> {
  const set = new Set<number>();
  let values: string[] = [];
  for (let i = 0; i < spec.length; i++) {
    const ch = spec[i];
    if (ch === "\\" && i + 1 < spec.length) {
      const esc = expandEscapes(spec.slice(i, i + 2));
      values.push(esc);
      i++;
      continue;
    }
    if (ch === "[" && spec[i + 1] === ":") {
      const end = spec.indexOf(":]", i + 2);
      if (end >= 0) {
        const cls = spec.slice(i + 2, end);
        const chars = CLASS_SETS[cls];
        if (chars) values = values.concat(chars);
        i = end + 1;
        continue;
      }
    }
    if (ch === "-" && values.length > 0 && i + 1 < spec.length) {
      const start = values.pop()!.charCodeAt(0);
      const next = spec[i + 1];
      const end = next === "\\" ? expandEscapes(spec.slice(i + 1, i + 3)).charCodeAt(0) : next.charCodeAt(0);
      for (let code = start; code <= end; code++) set.add(code);
      i += next === "\\" ? 2 : 1;
      continue;
    }
    values.push(ch);
  }
  for (const value of values) {
    for (const ch of Array.from(value)) set.add(ch.codePointAt(0) as number);
  }
  if (complement) {
    const inverted = new Set<number>();
    for (let code = 0; code < 256; code++) if (!set.has(code)) inverted.add(code);
    return inverted;
  }
  return set;
}

// ---------------------------------------------------------------------------
// Filesystem commands
// ---------------------------------------------------------------------------

function runLs(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "laAhRrStF1dinG",
    longBool: [
      "all",
      "almost-all",
      "long",
      "human-readable",
      "recursive",
      "reverse",
      "classify",
      "directory",
      "inode",
      "numeric-uid-gid",
      "color",
      "group-directories-first",
    ],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;

  const all = parsed.flags.has("a") || parsed.flags.has("all");
  const almost = parsed.flags.has("A") || parsed.flags.has("almost-all");
  const long = parsed.flags.has("l") || parsed.flags.has("long");
  const human = parsed.flags.has("h") || parsed.flags.has("human-readable");
  const recursive = parsed.flags.has("R") || parsed.flags.has("recursive");
  const reverse = parsed.flags.has("r") || parsed.flags.has("reverse");
  const byTime = parsed.flags.has("t");
  const bySize = parsed.flags.has("S");
  const classify = parsed.flags.has("F") || parsed.flags.has("classify");
  const directoryOnly = parsed.flags.has("d") || parsed.flags.has("directory");
  const showInode = parsed.flags.has("i") || parsed.flags.has("inode");
  const numeric = parsed.flags.has("n") || parsed.flags.has("numeric-uid-gid");
  const onePerLine = parsed.flags.has("1");

  const operands = parsed.operands.length > 0 ? parsed.operands : ["."];
  const includeHidden = all || almost;

  interface Entry {
    name: string;
    node: FsNode;
    path: string;
    linkTarget?: string;
  }

  const formatEntry = (entry: Entry): string => {
    let name = entry.name;
    if (classify) {
      if (entry.linkTarget !== undefined) name += "@";
      else if (entry.node.isDirectory()) name += "/";
      else if ((entry.node.mode & 0o111) !== 0) name += "*";
    }
    const color = nameColor(ctx, entry.node);
    const painted = color ? color + name + C.reset : name;
    if (entry.linkTarget !== undefined) {
      return painted + paint(ctx, C.gray, " -> ") + entry.linkTarget;
    }
    return painted;
  };

  const formatLong = (entries: Entry[]): string => {
    const sizeWidth = Math.max(
      1,
      ...entries.map((entry) => (human ? humanSize(entry.node.size()) : String(entry.node.size())).length),
    );
    const linkWidth = Math.max(1, ...entries.map((entry) => String(entry.node.nlink).length));
    const ownerWidth = Math.max(1, ...entries.map((entry) => (numeric ? String(entry.node.uid) : userFor(entry.node.uid)).length));
    const groupWidth = Math.max(1, ...entries.map((entry) => (numeric ? String(entry.node.gid) : groupFor(entry.node.gid)).length));
    return entries
      .map((entry) => {
        const size = human ? humanSize(entry.node.size()) : String(entry.node.size());
        const owner = numeric ? String(entry.node.uid) : userFor(entry.node.uid);
        const group = numeric ? String(entry.node.gid) : groupFor(entry.node.gid);
        const parts: string[] = [];
        if (showInode) parts.push(String(entry.node.ino).padStart(7, " "));
        parts.push(modeText(entry.node));
        parts.push(String(entry.node.nlink).padStart(linkWidth, " "));
        parts.push(owner.padStart(ownerWidth, " "));
        parts.push(group.padStart(groupWidth, " "));
        parts.push(size.padStart(sizeWidth, " "));
        parts.push(lsDate(entry.node.mtime));
        parts.push(formatEntry(entry));
        return parts.join(" ");
      })
      .join("\n");
  };

  const listDir = (dir: FsNode, displayPath: string, resolvedPath: string, depth: number): { out: string; err: string; code: number } => {
    let out = "";
    let err = "";
    let code = 0;
    try {
      ctx.fs.access(dir, 4, resolvedPath);
    } catch (error) {
      return { out: "", err: fsError(ctx, displayPath, error, "cannot open directory"), code: 2 };
    }
    const names = ctx.fs.list(dir, includeHidden);
    const entries: Entry[] = names.map((name) => {
      const node = dir.children!.get(name)!;
      let linkTarget: string | undefined;
      if (node.isSymlink() && long) linkTarget = node.target;
      return { name, node, path: joinPath(resolvedPath, name), linkTarget };
    });

    if (all) {
      const dotNode = dir;
      const parentPath = resolvedPath === "/" ? "/" : dirname(resolvedPath);
      let parentNode = dir;
      try {
        parentNode = ctx.fs.resolve(parentPath, "/").node;
      } catch {
        parentNode = dir;
      }
      entries.unshift({ name: ".", node: dotNode, path: resolvedPath });
      entries.unshift({ name: "..", node: parentNode, path: parentPath });
      const dot = entries.shift()!;
      const dotdot = entries.shift()!;
      entries.unshift(dotdot, dot);
    }

    if (bySize) entries.sort((a, b) => b.node.size() - a.node.size());
    else if (byTime) entries.sort((a, b) => b.node.mtime.getTime() - a.node.mtime.getTime());
    if (reverse) entries.reverse();

    if (long) {
      let blocks = 0;
      for (const entry of entries) blocks += Math.ceil(entry.node.size() / 512);
      out += paint(ctx, C.gray, `total ${blocks}`) + "\n";
      out += formatLong(entries) + (entries.length ? "\n" : "");
    } else {
      if (onePerLine || !ctx.tty) {
        out += entries.map((entry) => formatEntry(entry)).join("\n") + (entries.length ? "\n" : "");
      } else {
        out += entries.map((entry) => formatEntry(entry)).join("  ") + (entries.length ? "\n" : "");
      }
    }

    if (recursive && depth < 24) {
      for (const entry of entries) {
        if (entry.name === "." || entry.name === "..") continue;
        if (!entry.node.isDirectory()) continue;
        const childDisplay = displayPath === "/" ? "/" + entry.name : joinPath(displayPath, entry.name);
        const childResolved = joinPath(resolvedPath, entry.name);
        out += "\n" + paint(ctx, C.bold, childDisplay + ":") + "\n";
        const nested = listDir(entry.node, childDisplay, childResolved, depth + 1);
        out += nested.out;
        err += nested.err;
        code = code || nested.code;
      }
    }
    return { out, err, code };
  };

  let out = "";
  let errs = "";
  let code = 0;
  const directories: { display: string; node: FsNode; resolved: string }[] = [];

  for (const operand of operands) {
    let resolved;
    try {
      resolved = ctx.fs.resolve(operand, ctx.shell.cwd);
    } catch (error) {
      errs += fsError(ctx, operand, error, "cannot access");
      code = 2;
      continue;
    }
    // `ls -l link` describes the link itself, not its target.
    if (long) {
      try {
        const link = ctx.fs.lstat(operand, ctx.shell.cwd, false);
        if (link.node.isSymlink()) {
          out += formatLong([{ name: operand, node: link.node, path: link.path, linkTarget: link.node.target }]) + "\n";
          continue;
        }
      } catch {
        // fall through to the normal path
      }
    }
    if (resolved.node.isDirectory() && !directoryOnly) {
      directories.push({ display: operand, node: resolved.node, resolved: resolved.path });
      continue;
    }
    const entry: Entry = {
      name: operand,
      node: resolved.node,
      path: resolved.path,
      linkTarget: resolved.node.isSymlink() ? resolved.node.target : undefined,
    };
    out += (long ? formatLong([entry]) : formatEntry(entry)) + "\n";
  }

  const multiple = directories.length + (out ? 1 : 0) > 1;
  for (let i = 0; i < directories.length; i++) {
    const dir = directories[i];
    if (i > 0 || out) out += "\n";
    if (multiple) out += paint(ctx, C.bold, dir.display + ":") + "\n";
    const listed = listDir(dir.node, dir.display, dir.resolved, 0);
    out += listed.out;
    errs += listed.err;
    code = code || listed.code;
  }

  return { stdout: out, stderr: errs, code };
}

function runCd(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "PL" });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const physical = parsed.flags.has("P");
  let target = parsed.operands[0];
  let printNewDir = false;

  if (target === undefined) {
    target = ctx.env.HOME ?? HOME;
  } else if (target === "-") {
    target = ctx.env.OLDPWD ?? "";
    printNewDir = true;
    if (!target) return err(ctx, "OLDPWD not set");
  }

  let resolved;
  try {
    resolved = ctx.fs.resolve(target, ctx.shell.cwd);
  } catch (error) {
    return fail(fsError(ctx, target, error));
  }
  if (parsed.operands.length > 1) return err(ctx, "too many arguments");
  if (!resolved.node.isDirectory()) {
    return err(ctx, `not a directory: ${target}`);
  }
  try {
    ctx.fs.access(resolved.node, 1, resolved.path);
  } catch (error) {
    return fail(fsError(ctx, target, error));
  }

  const oldDisplay = ctx.shell.cwdDisplay;
  const display = physical ? resolved.path : normalizeLogical(target, ctx.shell.cwdDisplay);
  ctx.shell.setCwd(resolved.path, display);
  ctx.shell.env.PWD = display;
  ctx.shell.env.OLDPWD = oldDisplay;
  return ok(printNewDir ? display + "\n" : "");
}

function runPwd(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "PL" });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  if (parsed.operands.length > 0) return err(ctx, "too many arguments");
  return ok((parsed.flags.has("P") ? ctx.shell.cwd : ctx.shell.cwdDisplay) + "\n");
}

function runMkdir(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "pv", shortValue: "m", longBool: ["parents", "verbose"], longValue: ["mode"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const parents = parsed.flags.has("p") || parsed.flags.has("parents");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const modeSpec = parsed.opts.get("m") ?? parsed.opts.get("mode");
  let mode = 0o755;
  if (modeSpec !== undefined) {
    const parsedMode = parseOctalMode(modeSpec);
    if (parsedMode === null) return err(ctx, `invalid mode '${modeSpec}'`);
    mode = parsedMode;
  }
  if (parsed.operands.length === 0) return err(ctx, "missing operand");

  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    try {
      const result = ctx.fs.mkdir(operand, ctx.shell.cwd, { recursive: parents, mode });
      if (verbose) out += `${ctx.name}: created directory '${operand}'\n`;
      void result;
    } catch (error) {
      errors += fsError(ctx, operand, error, "cannot create directory");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runRmdir(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "pv", longBool: ["parents", "verbose"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const parents = parsed.flags.has("p") || parsed.flags.has("parents");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  if (parsed.operands.length === 0) return err(ctx, "missing operand");

  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    let current = operand;
    for (;;) {
      try {
        ctx.fs.rmdir(current, ctx.shell.cwd);
        if (verbose) out += `${ctx.name}: removing directory '${current}'\n`;
      } catch (error) {
        errors += fsError(ctx, current, error, "failed to remove");
        code = 1;
        break;
      }
      if (!parents) break;
      const next = dirname(current);
      if (next === "." || next === "/" || next === current) break;
      current = next;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function removeRecursiveGuarded(ctx: ExecContext, operand: string, verbose: boolean): { out: string; error: string } {
  const entry = ctx.fs.entry(operand, ctx.shell.cwd);
  const full = joinPath(entry.parentPath, entry.name);
  if (full === "/" ) {
    throw new FsError("EPERM", full);
  }
  const out = verbose ? `${ctx.name}: removed '${operand}'\n` : "";
  ctx.fs.removeTree(operand, ctx.shell.cwd);
  return { out, error: "" };
}

function runRm(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "rRfdv",
    longBool: ["recursive", "force", "dir", "verbose"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const recursive = parsed.flags.has("r") || parsed.flags.has("R") || parsed.flags.has("recursive");
  const force = parsed.flags.has("f") || parsed.flags.has("force");
  const dir = parsed.flags.has("d") || parsed.flags.has("dir");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  if (parsed.operands.length === 0) {
    if (force) return ok();
    return err(ctx, "missing operand");
  }

  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    if (recursive && normalizeLogical(operand, ctx.shell.cwd) === "/") {
      errors += `${ctx.name}: it is dangerous to operate recursively on '/'\n`;
      code = 1;
      continue;
    }
    let entry;
    try {
      entry = ctx.fs.entry(operand, ctx.shell.cwd);
    } catch (error) {
      if (!force) {
        errors += fsError(ctx, operand, error, "cannot remove");
        code = 1;
      }
      continue;
    }

    if (entry.node.isDirectory()) {
      if (!recursive && !dir) {
        errors += `${ctx.name}: cannot remove '${operand}': Is a directory\n`;
        code = 1;
        continue;
      }
      if (recursive) {
        try {
          out += removeRecursiveGuarded(ctx, operand, verbose).out;
        } catch (error) {
          errors += fsError(ctx, operand, error, "cannot remove");
          code = 1;
        }
      } else {
        try {
          ctx.fs.rmdir(operand, ctx.shell.cwd);
          if (verbose) out += `${ctx.name}: removed directory '${operand}'\n`;
        } catch (error) {
          errors += fsError(ctx, operand, error, "cannot remove");
          code = 1;
        }
      }
    } else {
      try {
        ctx.fs.unlink(operand, ctx.shell.cwd);
        if (verbose) out += `${ctx.name}: removed '${operand}'\n`;
      } catch (error) {
        errors += fsError(ctx, operand, error, "cannot remove");
        code = 1;
      }
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runTouch(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "amcv", longBool: ["no-create", "verbose"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const noCreate = parsed.flags.has("c") || parsed.flags.has("no-create");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  if (parsed.operands.length === 0) return err(ctx, "missing file operand");

  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    try {
      const exists = ctx.fs.exists(operand, ctx.shell.cwd);
      if (!exists) {
        if (noCreate) continue;
        ctx.fs.writeFile(operand, ctx.shell.cwd, "");
      } else {
        const resolved = ctx.fs.resolve(operand, ctx.shell.cwd);
        if (resolved.node.isDirectory()) {
          resolved.node.atime = new Date();
          resolved.node.mtime = new Date();
        } else {
          const now = new Date();
          resolved.node.atime = now;
          resolved.node.mtime = now;
          resolved.node.ctime = now;
        }
      }
      if (verbose) out += `${ctx.name}: '${operand}'\n`;
    } catch (error) {
      errors += fsError(ctx, operand, error, "cannot touch");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runMv(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "fnv",
    shortValue: "t",
    longBool: ["force", "no-clobber", "verbose"],
    longValue: ["target-directory"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const noClobber = parsed.flags.has("n") || parsed.flags.has("no-clobber");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const targetDir = parsed.opts.get("t") ?? parsed.opts.get("target-directory");

  const sources = parsed.operands.slice();
  let destination: string;
  if (targetDir !== undefined) {
    destination = targetDir;
  } else {
    if (sources.length < 2) return err(ctx, "missing destination file operand");
    destination = sources.pop() as string;
  }
  if (sources.length === 0) return err(ctx, "missing file operand");

  let destinationIsDir = false;
  try {
    const resolved = ctx.fs.resolve(destination, ctx.shell.cwd);
    destinationIsDir = resolved.node.isDirectory();
  } catch {
    destinationIsDir = false;
  }
  if (sources.length > 1 && !destinationIsDir) {
    return err(ctx, `target '${destination}' is not a directory`);
  }

  let out = "";
  let errors = "";
  let code = 0;
  for (const source of sources) {
    const finalDest = destinationIsDir ? joinPath(destination, basename(source)) : destination;
    try {
      const moved = ctx.fs.move(source, ctx.shell.cwd, finalDest, ctx.shell.cwd, { noClobber });
      if (verbose) out += `renamed '${source}' -> '${finalDest}'\n`;
      void moved;
    } catch (error) {
      errors += fsError(ctx, source, error, "cannot move");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function copyNode(ctx: ExecContext, sourcePath: string, destPath: string, recursive: boolean, noClobber: boolean): string | null {
  // Recursive copies preserve symlinks (POSIX `cp -R`); a plain `cp link out`
  // follows the link like the real thing does.
  const source = recursive
    ? ctx.fs.lstat(sourcePath, ctx.shell.cwd, false)
    : ctx.fs.resolve(sourcePath, ctx.shell.cwd);
  const node = source.node;

  let destResolved: { node: FsNode; path: string } | null = null;
  try {
    destResolved = ctx.fs.resolve(destPath, ctx.shell.cwd);
  } catch {
    destResolved = null;
  }

  if (destResolved && destResolved.node.isDirectory()) {
    destPath = joinPath(destPath, basename(sourcePath));
    try {
      destResolved = ctx.fs.resolve(destPath, ctx.shell.cwd);
    } catch {
      destResolved = null;
    }
  }

  if (destResolved) {
    if (noClobber) throw new FsError("EEXIST", destPath);
    if (destResolved.node.isDirectory() && node.isDirectory()) {
      throw new FsError("EISDIR", destPath);
    }
    if (!destResolved.node.isDirectory()) {
      ctx.fs.unlink(destPath, ctx.shell.cwd);
    }
  }

  if (node.isDirectory()) {
    if (!recursive) throw new FsError("EISDIR", sourcePath);
    try {
      ctx.fs.mkdir(destPath, ctx.shell.cwd, { mode: node.mode });
    } catch (error) {
      if (!(error instanceof FsError) || error.code !== "EEXIST") throw error;
    }
    const names = ctx.fs.list(node, true);
    for (const name of names) {
      copyNode(ctx, joinPath(sourcePath, name), joinPath(destPath, name), true, noClobber);
    }
    return destPath;
  }

  if (node.isSymlink()) {
    ctx.fs.symlink(node.target ?? "", destPath, ctx.shell.cwd);
    return destPath;
  }

  const { parent, parentPath, name } = ctx.fs.resolveParent(destPath, ctx.shell.cwd);
  const created = ctx.fs.createFile(parent, parentPath, name, node.content, node.mode);
  created.atime = new Date(node.atime);
  created.mtime = new Date(node.mtime);
  return joinPath(parentPath, name);
}

function runCp(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "rRfnvpda",
    shortValue: "t",
    longBool: ["recursive", "force", "no-clobber", "verbose", "preserve", "archive"],
    longValue: ["target-directory"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const recursive =
    parsed.flags.has("r") || parsed.flags.has("R") || parsed.flags.has("recursive") ||
    parsed.flags.has("a") || parsed.flags.has("archive");
  const noClobber = parsed.flags.has("n") || parsed.flags.has("no-clobber");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const targetDir = parsed.opts.get("t") ?? parsed.opts.get("target-directory");

  const operands = parsed.operands.slice();
  let destination: string;
  if (targetDir !== undefined) {
    destination = targetDir;
  } else {
    if (operands.length < 2) return err(ctx, "missing destination file operand");
    destination = operands.pop() as string;
  }
  if (operands.length === 0) return err(ctx, "missing file operand");

  let destinationIsDir = false;
  try {
    destinationIsDir = ctx.fs.resolve(destination, ctx.shell.cwd).node.isDirectory();
  } catch {
    destinationIsDir = false;
  }
  if (operands.length > 1 && !destinationIsDir) {
    return err(ctx, `target '${destination}' is not a directory`);
  }

  let out = "";
  let errors = "";
  let code = 0;
  for (const source of operands) {
    const dest = destinationIsDir ? joinPath(destination, basename(source)) : destination;
    if (source === "/" && recursive) {
      errors += `${ctx.name}: cannot copy '/'\n`;
      code = 1;
      continue;
    }
    try {
      copyNode(ctx, source, dest, recursive, noClobber);
      if (verbose) out += `'${source}' -> '${dest}'\n`;
    } catch (error) {
      errors += fsError(ctx, source, error, "cannot copy");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runLn(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "sfnv",
    shortValue: "t",
    longBool: ["symbolic", "force", "no-dereference", "verbose"],
    longValue: ["target-directory"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const symbolic = parsed.flags.has("s") || parsed.flags.has("symbolic");
  const force = parsed.flags.has("f") || parsed.flags.has("force");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const targetDir = parsed.opts.get("t") ?? parsed.opts.get("target-directory");

  const operands = parsed.operands.slice();
  let destination: string;
  if (targetDir !== undefined) {
    if (operands.length !== 1) return err(ctx, "missing file operand");
    destination = joinPath(targetDir, basename(operands[0]));
  } else {
    if (operands.length < 2) return err(ctx, "missing destination file operand");
    destination = operands[1];
  }
  const source = operands[0];

  let destIsDir = false;
  try {
    destIsDir = ctx.fs.resolve(destination, ctx.shell.cwd).node.isDirectory();
  } catch {
    destIsDir = false;
  }
  const finalDest = destIsDir ? joinPath(destination, basename(source)) : destination;

  try {
    if (force && ctx.fs.exists(finalDest, ctx.shell.cwd, false)) {
      try {
        ctx.fs.unlink(finalDest, ctx.shell.cwd);
      } catch {
        ctx.fs.removeTree(finalDest, ctx.shell.cwd);
      }
    }
    if (symbolic) {
      ctx.fs.symlink(source, finalDest, ctx.shell.cwd);
      if (verbose) return ok(`'${finalDest}' -> '${source}'\n`);
    } else {
      ctx.fs.hardlink(source, ctx.shell.cwd, finalDest, ctx.shell.cwd);
      if (verbose) return ok(`'${finalDest}' => '${source}'\n`);
    }
    return ok();
  } catch (error) {
    return fail(fsError(ctx, finalDest, error, "failed to create link"), 1);
  }
}

function applySymbolicMode(node: FsNode, spec: string): number {
  let mode = node.mode;
  for (const clause of spec.split(",")) {
    const match = /^([ugoa]*)([+=-])([rwxXst]*)$/.exec(clause);
    if (!match) throw new Error(`invalid mode: '${spec}'`);
    const who = match[1] === "" ? "a" : match[1];
    const op = match[2];
    const perms = match[3];
    const targets: number[] = [];
    if (who.indexOf("u") >= 0 || who.indexOf("a") >= 0) targets.push(6);
    if (who.indexOf("g") >= 0 || who.indexOf("a") >= 0) targets.push(3);
    if (who.indexOf("o") >= 0 || who.indexOf("a") >= 0) targets.push(0);

    let bits = 0;
    let special = 0;
    for (const perm of perms) {
      if (perm === "r") bits |= 4;
      else if (perm === "w") bits |= 2;
      else if (perm === "x") bits |= 1;
      else if (perm === "X") {
        if (node.isDirectory() || (mode & 0o111) !== 0) bits |= 1;
      } else if (perm === "s") {
        if (targets.indexOf(6) >= 0) special |= 0o4000;
        if (targets.indexOf(3) >= 0) special |= 0o2000;
      } else if (perm === "t") {
        special |= 0o1000;
      }
    }

    for (const shift of targets) {
      const value = (bits & 7) << shift;
      if (op === "+") mode |= value;
      else if (op === "-") mode &= ~value;
      else mode = (mode & ~(7 << shift)) | value;
    }
    if (special) {
      if (op === "+") mode |= special;
      else if (op === "-") mode &= ~special;
      else mode = (mode & ~0o7000) | special;
    }
  }
  return mode & 0o7777;
}

function runChmod(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "Rv", longBool: ["recursive", "verbose"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  if (parsed.operands.length < 2) return err(ctx, "missing operand");
  const recursive = parsed.flags.has("R") || parsed.flags.has("recursive");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const modeSpec = parsed.operands[0];
  const targets = parsed.operands.slice(1);
  const octal = parseOctalMode(modeSpec);

  let out = "";
  let errors = "";
  let code = 0;
  for (const target of targets) {
    try {
      const resolved = ctx.fs.resolve(target, ctx.shell.cwd);
      const mode = octal !== null ? octal : applySymbolicMode(resolved.node, modeSpec);
      ctx.fs.chmod(target, ctx.shell.cwd, mode, recursive);
      if (verbose) out += `mode of '${target}' changed to ${mode.toString(8)}\n`;
    } catch (error) {
      errors += fsError(ctx, target, error, "changing permissions of");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function statFormat(resolved: { node: FsNode; path: string }, format: string): string {
  const node = resolved.node;
  return format.replace(/%([nNsSaAbBdefFgGhHiImMtTuUxXyYzZ%])/g, (all, key: string) => {
    switch (key) {
      case "n":
        return resolved.path;
      case "N":
        return `'${resolved.path}'`;
      case "s":
        return String(node.size());
      case "a":
        return (node.mode & 0o777).toString(8);
      case "A":
        return formatMode(node);
      case "u":
        return String(node.uid);
      case "U":
        return userFor(node.uid);
      case "g":
        return String(node.gid);
      case "G":
        return groupFor(node.gid);
      case "i":
        return String(node.ino);
      case "h":
        return String(node.nlink);
      case "F":
        return node.isDirectory() ? "directory" : node.isSymlink() ? "symbolic link" : "regular file";
      case "y":
        return node.mtime.toISOString().replace("T", " ").replace("Z", " +0000");
      case "Y":
        return String(Math.floor(node.mtime.getTime() / 1000));
      case "%":
        return "%";
      default:
        return all;
    }
  });
}

function runStat(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "Lt",
    shortValue: "c",
    longBool: ["dereference", "terse"],
    longValue: ["format", "printf"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  if (parsed.operands.length === 0) return err(ctx, "missing operand");
  const follow = parsed.flags.has("L") || parsed.flags.has("dereference");
  const terse = parsed.flags.has("t") || parsed.flags.has("terse");
  const format = parsed.opts.get("c") ?? parsed.opts.get("format") ?? parsed.opts.get("printf");

  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    try {
      const resolved = ctx.fs.resolve(operand, ctx.shell.cwd, { followFinal: follow });
      if (format !== undefined) {
        out += statFormat(resolved, format) + "\n";
        continue;
      }
      const node = resolved.node;
      const type = node.isDirectory() ? "directory" : node.isSymlink() ? "symbolic link" : "regular file";
      if (terse) {
        out += `${resolved.path} ${node.size()} ${(node.mode & 0o777).toString(8)} ${node.uid} ${node.gid} ${node.mtime.getTime() / 1000}\n`;
        continue;
      }
      out += `  File: ${resolved.path}${node.isSymlink() ? ` -> ${node.target}` : ""}\n`;
      out += `  Size: ${String(node.size()).padEnd(10)} Blocks: ${Math.ceil(node.size() / 512)}          IO Block: 4096   ${type}\n`;
      out += `Device: 0,32\tInode: ${node.ino}\tLinks: ${node.nlink}\n`;
      out += `Access: (${(node.mode & 0o777).toString(8).padStart(4, "0")}/${formatMode(node)})  Uid: (${String(node.uid).padStart(5, " ")}/${userFor(node.uid)})   Gid: (${String(node.gid).padStart(5, " ")}/${groupFor(node.gid)})\n`;
      out += `Access: ${node.atime.toUTCString()}\nModify: ${node.mtime.toUTCString()}\nChange: ${node.ctime.toUTCString()}\n`;
      out += " Birth: " + node.ctime.toUTCString() + "\n";
    } catch (error) {
      errors += fsError(ctx, operand, error, "cannot stat");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

// ---------------------------------------------------------------------------
// Text commands
// ---------------------------------------------------------------------------

function runCat(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "nbsETAv", longBool: ["number", "number-nonblank", "squeeze-blank", "show-ends", "show-tabs", "show-all"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const number = parsed.flags.has("n") || parsed.flags.has("number");
  const numberNonBlank = parsed.flags.has("b") || parsed.flags.has("number-nonblank");
  const squeeze = parsed.flags.has("s") || parsed.flags.has("squeeze-blank");
  const showEnds = parsed.flags.has("E") || parsed.flags.has("show-ends") || parsed.flags.has("A") || parsed.flags.has("show-all");
  const showTabs = parsed.flags.has("T") || parsed.flags.has("show-tabs") || parsed.flags.has("A") || parsed.flags.has("show-all");
  const input = inputLines(ctx, parsed.operands);
  if (input.code !== 0 && input.parts.length === 0) {
    return { stderr: input.errors, code: input.code };
  }

  let out = "";
  let lineNo = 0;
  let previousBlank = false;
  for (const part of input.parts) {
    const lines = part.split("\n");
    if (lines[lines.length - 1] === "") lines.pop();
    for (const rawLine of lines) {
      const blank = rawLine.trim() === "";
      if (squeeze) {
        if (blank && previousBlank) continue;
        previousBlank = blank;
      }
      let line = rawLine;
      if (showTabs) line = line.replace(/\t/g, "^I");
      let prefix = "";
      if (numberNonBlank) {
        if (!blank) prefix = `${String(++lineNo).padStart(6, " ")}\t`;
      } else if (number) {
        prefix = `${String(++lineNo).padStart(6, " ")}\t`;
      }
      out += prefix + line + (showEnds ? "$" : "") + "\n";
    }
  }
  return { stdout: out, stderr: input.errors, code: input.code };
}

function runEcho(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "neE" });
  if (parsed.error) {
    // POSIX echo treats unknown flags as text.
    return ok(ctx.args.join(" ") + "\n");
  }
  const noNewline = parsed.flags.has("n");
  const escapes = parsed.flags.has("e");
  let text = parsed.operands.join(" ");
  if (escapes) {
    const suppressed = text.indexOf("\\c") >= 0;
    text = expandEscapes(text);
    return ok(text + (noNewline || suppressed ? "" : "\n"));
  }
  return ok(text + (noNewline ? "" : "\n"));
}

function formatPrintf(format: string, args: string[]): string {
  let out = "";
  let argIndex = 0;
  let iterations = 0;
  const formatString = format;
  do {
    let i = 0;
    while (i < formatString.length) {
      const ch = formatString[i];
      if (ch === "\\") {
        const match = /^\\(x[0-9a-fA-F]{1,2}|[0-7]{1,3}|.)/.exec(formatString.slice(i));
        if (match) {
          out += expandEscapes(match[0]);
          i += match[0].length;
          continue;
        }
        out += ch;
        i++;
        continue;
      }
      if (ch !== "%") {
        out += ch;
        i++;
        continue;
      }
      const spec = /^%([-+ 0#]*)(\d+)?(?:\.(\d+))?([diouxXeEfgGcsb%])/.exec(formatString.slice(i));
      if (!spec) {
        out += ch;
        i++;
        continue;
      }
      i += spec[0].length;
      const flags = spec[1];
      const width = spec[2] ? parseInt(spec[2], 10) : 0;
      const precision = spec[3] !== undefined ? parseInt(spec[3], 10) : undefined;
      const conv = spec[4];
      if (conv === "%") {
        out += "%";
        continue;
      }
      const arg = args[argIndex++] ?? "";
      let value = "";
      switch (conv) {
        case "s":
          value = arg;
          if (precision !== undefined) value = value.slice(0, precision);
          break;
        case "b":
          value = expandEscapes(arg);
          break;
        case "c":
          value = arg.slice(0, 1);
          break;
        case "d":
        case "i":
          value = String(parseInt(arg, 10) || 0);
          break;
        case "u":
          value = String(Math.max(0, parseInt(arg, 10) || 0));
          break;
        case "o":
          value = (parseInt(arg, 10) || 0).toString(8);
          break;
        case "x":
          value = (parseInt(arg, 10) || 0).toString(16);
          break;
        case "X":
          value = (parseInt(arg, 10) || 0).toString(16).toUpperCase();
          break;
        case "e":
        case "E": {
          const n = parseFloat(arg) || 0;
          value = n.toExponential(precision);
          if (conv === "E") value = value.toUpperCase();
          break;
        }
        case "f": {
          const n = parseFloat(arg) || 0;
          value = n.toFixed(precision ?? 6);
          break;
        }
        case "g":
        case "G": {
          const n = parseFloat(arg) || 0;
          value = precision !== undefined ? n.toPrecision(precision) : String(n);
          if (conv === "G") value = value.toUpperCase();
          break;
        }
      }
      if (conv === "d" || conv === "i") {
        const numeric = parseInt(value, 10) || 0;
        if (flags.indexOf("+") >= 0 && numeric >= 0) value = "+" + value;
        if (flags.indexOf(" ") >= 0 && numeric >= 0) value = " " + value;
      }
      if (flags.indexOf("0") >= 0 && conv !== "s" && conv !== "c" && flags.indexOf("-") < 0) {
        value = value.padStart(width, "0");
      } else if (width > 0) {
        value = flags.indexOf("-") >= 0 ? value.padEnd(width) : value.padStart(width);
      }
      out += value;
    }
    iterations++;
  } while (argIndex < args.length && iterations < 64);
  return out;
}

function runPrintf(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0) return err(ctx, "usage: printf format [arguments]");
  const format = ctx.args[0];
  return ok(formatPrintf(format, ctx.args.slice(1)));
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** POSIX allows `head -5` as shorthand for `head -n 5`. */
function normalizeCountArgs(args: string[]): string[] {
  const out: string[] = [];
  for (const arg of args) {
    if (/^-\d+$/.test(arg)) out.push("-n", arg.slice(1));
    else out.push(arg);
  }
  return out;
}

function runHead(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(normalizeCountArgs(ctx.args), {
    shortBool: "qv",
    shortValue: "nc",
    longBool: ["quiet", "silent", "verbose"],
    longValue: ["lines", "bytes"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const quiet = parsed.flags.has("q") || parsed.flags.has("quiet") || parsed.flags.has("silent");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const countSpec = parsed.opts.get("n") ?? parsed.opts.get("lines") ?? "10";
  const byteSpec = parsed.opts.get("c") ?? parsed.opts.get("bytes");
  const count = parseInt(countSpec, 10);
  if (Number.isNaN(count) || count < 0) return err(ctx, `invalid number of lines: '${countSpec}'`);

  const files = parsed.operands.length > 0 ? parsed.operands : ["-"];
  let out = "";
  let errors = "";
  let code = 0;
  const showHeaders = files.length > 1 && !quiet;
  let first = true;

  for (const file of files) {
    let content: string;
    if (file === "-") content = ctx.stdin;
    else {
      try {
        content = ctx.fs.readFile(file, ctx.shell.cwd).content;
      } catch (error) {
        errors += fsError(ctx, file, error, "cannot open");
        code = 1;
        continue;
      }
    }
    if ((showHeaders || verbose) && !first) out += "\n";
    if (showHeaders || verbose) out += `==> ${file === "-" ? "standard input" : file} <==\n`;
    first = false;
    if (byteSpec !== undefined) {
      const bytes = parseInt(byteSpec, 10);
      if (Number.isNaN(bytes) || bytes < 0) {
        errors += `${ctx.name}: invalid number of bytes: '${byteSpec}'\n`;
        code = 1;
        continue;
      }
      out += content.slice(0, bytes);
      if (content.length > bytes) out += "\n";
    } else {
      const lines = splitLines(content);
      out += lines.slice(0, count).join("\n");
      if (lines.length > 0) out += "\n";
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runTail(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(normalizeCountArgs(ctx.args), {
    shortBool: "qv",
    shortValue: "nc",
    longBool: ["quiet", "silent", "verbose"],
    longValue: ["lines", "bytes"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const quiet = parsed.flags.has("q") || parsed.flags.has("quiet") || parsed.flags.has("silent");
  const verbose = parsed.flags.has("v") || parsed.flags.has("verbose");
  const countSpec = parsed.opts.get("n") ?? parsed.opts.get("lines") ?? "10";
  const byteSpec = parsed.opts.get("c") ?? parsed.opts.get("bytes");
  const plus = countSpec.startsWith("+");
  const count = parseInt(plus ? countSpec.slice(1) : countSpec, 10);
  if (Number.isNaN(count)) return err(ctx, `invalid number of lines: '${countSpec}'`);

  const files = parsed.operands.length > 0 ? parsed.operands : ["-"];
  let out = "";
  let errors = "";
  let code = 0;
  const showHeaders = files.length > 1 && !quiet;
  let first = true;

  for (const file of files) {
    let content: string;
    if (file === "-") content = ctx.stdin;
    else {
      try {
        content = ctx.fs.readFile(file, ctx.shell.cwd).content;
      } catch (error) {
        errors += fsError(ctx, file, error, "cannot open");
        code = 1;
        continue;
      }
    }
    if ((showHeaders || verbose) && !first) out += "\n";
    if (showHeaders || verbose) out += `==> ${file === "-" ? "standard input" : file} <==\n`;
    first = false;
    if (byteSpec !== undefined) {
      const bytes = parseInt(byteSpec, 10);
      if (Number.isNaN(bytes)) {
        errors += `${ctx.name}: invalid number of bytes: '${byteSpec}'\n`;
        code = 1;
        continue;
      }
      out += content.slice(Math.max(0, content.length - bytes));
      continue;
    }
    const lines = splitLines(content);
    const selected = plus ? lines.slice(Math.max(0, count - 1)) : lines.slice(Math.max(0, lines.length - count));
    out += selected.join("\n");
    if (selected.length > 0) out += "\n";
  }
  return { stdout: out, stderr: errors, code };
}

function runWc(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "lwcmL",
    longBool: ["lines", "words", "bytes", "chars", "max-line-length"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  let showLines = parsed.flags.has("l") || parsed.flags.has("lines");
  let showWords = parsed.flags.has("w") || parsed.flags.has("words");
  let showBytes = parsed.flags.has("c") || parsed.flags.has("bytes");
  const showChars = parsed.flags.has("m") || parsed.flags.has("chars");
  const showMax = parsed.flags.has("L") || parsed.flags.has("max-line-length");
  if (!showLines && !showWords && !showBytes && !showChars && !showMax) {
    showLines = showWords = showBytes = true;
  }

  const files = parsed.operands.length > 0 ? parsed.operands : ["-"];
  const rows: { label: string; lines: number; words: number; bytes: number; chars: number; max: number }[] = [];
  let errors = "";
  let code = 0;

  for (const file of files) {
    let content: string;
    if (file === "-") content = ctx.stdin;
    else {
      try {
        content = ctx.fs.readFile(file, ctx.shell.cwd).content;
      } catch (error) {
        errors += fsError(ctx, file, error, "cannot open");
        code = 1;
        continue;
      }
    }
    const lines = content === "" ? 0 : content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
    const words = content.trim() === "" ? 0 : content.trim().split(/\s+/).length;
    const bytes = new TextEncoder().encode(content).length;
    const chars = Array.from(content).length;
    const max = content.split("\n").reduce((m, line) => Math.max(m, Array.from(line).length), 0);
    rows.push({ label: file === "-" ? "" : file, lines, words, bytes, chars, max });
  }

  const total = rows.reduce(
    (acc, row) => ({
      lines: acc.lines + row.lines,
      words: acc.words + row.words,
      bytes: acc.bytes + row.bytes,
      chars: acc.chars + row.chars,
      max: Math.max(acc.max, row.max),
    }),
    { lines: 0, words: 0, bytes: 0, chars: 0, max: 0 },
  );

  const formatRow = (row: typeof total, label: string): string => {
    const cols: string[] = [];
    if (showLines) cols.push(String(row.lines));
    if (showWords) cols.push(String(row.words));
    if (showChars) cols.push(String(row.chars));
    if (showBytes) cols.push(String(row.bytes));
    if (showMax) cols.push(String(row.max));
    const width = Math.max(...cols.map((c) => c.length));
    return cols.map((c) => c.padStart(width, " ")).join(" ") + (label ? " " + label : "") + "\n";
  };

  let out = "";
  for (const row of rows) out += formatRow(row, row.label);
  if (rows.length > 1) out += formatRow(total, "total");
  return { stdout: out, stderr: errors, code };
}

function globToRegExp(pattern: string): RegExp {
  let source = "^";
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === "*") source += "[^/]*";
    else if (ch === "?") source += "[^/]";
    else if (ch === "[") {
      const end = pattern.indexOf("]", i + 1);
      if (end < 0) source += "\\[";
      else {
        let inner = pattern.slice(i + 1, end);
        if (inner.startsWith("!")) inner = "^" + inner.slice(1);
        source += "[" + inner.replace(/\\/g, "\\\\") + "]";
        i = end;
      }
    } else if ("\\^$+.|(){}".indexOf(ch) >= 0) source += "\\" + ch;
    else source += ch;
  }
  return new RegExp(source + "$");
}

function collectFiles(ctx: ExecContext, roots: string[], recursive: boolean): { files: string[]; errors: string } {
  const files: string[] = [];
  let errors = "";
  const walk = (path: string, depth: number) => {
    let resolved;
    try {
      resolved = ctx.fs.resolve(path, ctx.shell.cwd);
    } catch (error) {
      errors += fsError(ctx, path, error, "");
      return;
    }
    if (resolved.node.isDirectory()) {
      if (!recursive) {
        errors += `${ctx.name}: ${path}: Is a directory\n`;
        return;
      }
      if (depth > 32) return;
      const names = ctx.fs.list(resolved.node, true);
      for (const name of names) walk(joinPath(path, name), depth + 1);
    } else {
      files.push(path);
    }
  };
  for (const root of roots) walk(root, 0);
  return { files, errors };
}

function runGrep(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "ivnclLqREFwxohHr",
    shortValue: "e",
    longBool: [
      "ignore-case", "invert-match", "line-number", "count", "files-with-matches",
      "files-without-match", "quiet", "silent", "extended-regexp", "fixed-strings",
      "word-regexp", "line-regexp", "only-matching", "no-filename", "with-filename",
      "recursive", "color",
    ],
    longValue: ["regexp"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;

  const ignoreCase = parsed.flags.has("i") || parsed.flags.has("ignore-case");
  const invert = parsed.flags.has("v") || parsed.flags.has("invert-match");
  const lineNumber = parsed.flags.has("n") || parsed.flags.has("line-number");
  const countOnly = parsed.flags.has("c") || parsed.flags.has("count");
  const filesWith = parsed.flags.has("l") || parsed.flags.has("files-with-matches");
  const filesWithout = parsed.flags.has("L") || parsed.flags.has("files-without-match");
  const quiet = parsed.flags.has("q") || parsed.flags.has("quiet") || parsed.flags.has("silent");
  const extended = parsed.flags.has("E") || parsed.flags.has("extended-regexp");
  const fixed = parsed.flags.has("F") || parsed.flags.has("fixed-strings");
  const word = parsed.flags.has("w") || parsed.flags.has("word-regexp");
  const wholeLine = parsed.flags.has("x") || parsed.flags.has("line-regexp");
  const onlyMatching = parsed.flags.has("o") || parsed.flags.has("only-matching");
  const noFilename = parsed.flags.has("h") || parsed.flags.has("no-filename");
  const withFilename = parsed.flags.has("H") || parsed.flags.has("with-filename");
  const recursive = parsed.flags.has("r") || parsed.flags.has("R") || parsed.flags.has("recursive");

  let pattern = parsed.opts.get("e") ?? parsed.opts.get("regexp");
  const operands = parsed.operands.slice();
  if (pattern === undefined) {
    pattern = operands.shift();
  }
  if (pattern === undefined) return err(ctx, "missing pattern");
  if (operands.length === 0 && !recursive) operands.push("-");

  let matcher: RegExp;
  try {
    if (fixed) {
      let source = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (word) source = `(?:^|\\W)${source}(?=\\W|$)`;
      if (wholeLine) source = `^${source}$`;
      matcher = new RegExp(source, ignoreCase ? "im" : "m");
    } else {
      let source = pattern;
      if (word) source = `(?:^|\\W)${source}(?=\\W|$)`;
      if (wholeLine) source = `^(?:${source})$`;
      matcher = patternToRegExp(source, extended);
      if (ignoreCase) matcher = new RegExp(matcher.source, "im");
    }
  } catch (error) {
    return err(ctx, `invalid regular expression: ${error instanceof Error ? error.message : String(error)}`, 2);
  }

  let files = operands;
  let errors = "";
  if (recursive) {
    const roots = operands.length > 0 ? operands : ["."];
    const collected = collectFiles(ctx, roots, true);
    files = collected.files;
    errors += collected.errors;
  }

  const showFilenameDefault = files.length > 1 || recursive;
  const showFilename = withFilename || (showFilenameDefault && !noFilename);
  let out = "";
  let matchedAny = false;

  for (const file of files) {
    let content: string;
    if (file === "-") content = ctx.stdin;
    else {
      try {
        content = ctx.fs.readFile(file, ctx.shell.cwd).content;
      } catch (error) {
        errors += fsError(ctx, file, error, "");
        continue;
      }
    }

    const lines = splitLines(content);
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      matcher.lastIndex = 0;
      const matches = matcher.test(line);
      const selected = invert ? !matches : matches;
      if (!selected) continue;
      count++;
      matchedAny = true;
      if (quiet || countOnly || filesWith || filesWithout) continue;

      const prefix = (showFilename ? paint(ctx, C.magenta, file + ":") : "") + (lineNumber ? paint(ctx, C.green, `${i + 1}:`) : "");
      if (onlyMatching && !invert) {
        const global = new RegExp(matcher.source, ignoreCase ? "gim" : "gm");
        let match: RegExpExecArray | null;
        while ((match = global.exec(line)) !== null) {
          if (match[0] === "") {
            global.lastIndex++;
            continue;
          }
          out += prefix + paint(ctx, C.red, match[0]) + "\n";
        }
      } else {
        let display = line;
        if (!invert && ctx.tty) {
          const global = new RegExp(matcher.source, ignoreCase ? "gim" : "gm");
          display = line.replace(global, (m) => (m === "" ? m : C.red + m + C.reset));
        }
        out += prefix + display + "\n";
      }
    }

    if (quiet && count > 0) return { stdout: "", stderr: errors, code: 0 };
    if (countOnly) out += (showFilename ? file + ":" : "") + count + "\n";
    if (filesWith && count > 0) out += file + "\n";
    if (filesWithout && count === 0) out += file + "\n";
  }

  return { stdout: out, stderr: errors, code: matchedAny ? 0 : 1 };
}

function runSort(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "rnufb",
    shortValue: "kt",
    longBool: ["reverse", "numeric-sort", "unique", "ignore-case", "dictionary-order"],
    longValue: ["key", "field-separator"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const reverse = parsed.flags.has("r") || parsed.flags.has("reverse");
  const numeric = parsed.flags.has("n") || parsed.flags.has("numeric-sort");
  const unique = parsed.flags.has("u") || parsed.flags.has("unique");
  const ignoreCase = parsed.flags.has("f") || parsed.flags.has("ignore-case");
  const keySpec = parsed.opts.get("k") ?? parsed.opts.get("key");
  const separator = parsed.opts.get("t") ?? parsed.opts.get("field-separator");
  const key = keySpec ? parseInt(keySpec, 10) - 1 : -1;

  const input = inputLines(ctx, parsed.operands);
  const lines = input.parts.join("").replace(/\n$/, "").split("\n");
  if (lines.length === 1 && lines[0] === "") return ok("", input.code);

  const keyOf = (line: string): string => {
    if (key < 0) return line;
    const fields = separator ? line.split(separator) : line.trim().split(/\s+/);
    return fields[key] ?? "";
  };

  const compare = (a: string, b: string): number => {
    const ka = keyOf(a);
    const kb = keyOf(b);
    if (numeric) {
      const na = parseFloat(ka);
      const nb = parseFloat(kb);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    }
    const sa = ignoreCase ? ka.toLowerCase() : ka;
    const sb = ignoreCase ? kb.toLowerCase() : kb;
    return sa < sb ? -1 : sa > sb ? 1 : 0;
  };

  lines.sort(compare);
  let result = lines;
  if (reverse) result = result.slice().reverse();
  if (unique) {
    const seen: string[] = [];
    result = result.filter((line) => {
      if (seen.length > 0 && compare(seen[seen.length - 1], line) === 0) return false;
      seen.push(line);
      return true;
    });
  }
  return { stdout: result.join("\n") + "\n", stderr: input.errors, code: input.code };
}

function runUniq(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "cdui",
    longBool: ["count", "repeated", "unique", "ignore-case"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const showCount = parsed.flags.has("c") || parsed.flags.has("count");
  const repeatedOnly = parsed.flags.has("d") || parsed.flags.has("repeated");
  const uniqueOnly = parsed.flags.has("u") || parsed.flags.has("unique");
  const ignoreCase = parsed.flags.has("i") || parsed.flags.has("ignore-case");
  const input = inputLines(ctx, parsed.operands);
  const lines = input.parts.join("").replace(/\n$/, "").split("\n");
  if (lines.length === 1 && lines[0] === "") return ok("", input.code);

  interface Group { line: string; count: number }
  const groups: Group[] = [];
  for (const line of lines) {
    const previous = groups[groups.length - 1];
    const same = previous && (ignoreCase ? previous.line.toLowerCase() === line.toLowerCase() : previous.line === line);
    if (same) previous.count++;
    else groups.push({ line, count: 1 });
  }

  let out = "";
  for (const group of groups) {
    if (repeatedOnly && group.count < 2) continue;
    if (uniqueOnly && group.count > 1) continue;
    out += (showCount ? String(group.count).padStart(7, " ") + " " : "") + group.line + "\n";
  }
  return { stdout: out, stderr: input.errors, code: input.code };
}

function runCut(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "s",
    shortValue: "dfc",
    longBool: ["only-delimited"],
    longValue: ["delimiter", "fields", "characters"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const delimiter = parsed.opts.get("d") ?? parsed.opts.get("delimiter") ?? "\t";
  const fieldsSpec = parsed.opts.get("f") ?? parsed.opts.get("fields");
  const charsSpec = parsed.opts.get("c") ?? parsed.opts.get("characters");
  const onlyDelimited = parsed.flags.has("s") || parsed.flags.has("only-delimited");
  if (fieldsSpec === undefined && charsSpec === undefined) return err(ctx, "you must specify a list of bytes, characters, or fields");

  const input = inputLines(ctx, parsed.operands);
  const lines = input.parts.join("").replace(/\n$/, "").split("\n");
  let out = "";
  if (fieldsSpec !== undefined) {
    const fields = splitRangeList(fieldsSpec, 10000);
    for (const line of lines) {
      if (line === "") continue;
      if (line.indexOf(delimiter) < 0) {
        if (!onlyDelimited) out += line + "\n";
        continue;
      }
      const parts = line.split(delimiter);
      out += fields.map((n) => parts[n - 1] ?? "").join(delimiter) + "\n";
    }
  } else {
    const chars = splitRangeList(charsSpec as string, 100000);
    for (const line of lines) {
      const glyphs = Array.from(line);
      out += chars.filter((n) => n >= 1 && n <= glyphs.length).map((n) => glyphs[n - 1]).join("") + "\n";
    }
  }
  return { stdout: out, stderr: input.errors, code: input.code };
}

function runTr(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "dsc",
    longBool: ["delete", "squeeze-repeats", "complement"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const del = parsed.flags.has("d") || parsed.flags.has("delete");
  const squeeze = parsed.flags.has("s") || parsed.flags.has("squeeze-repeats");
  const complement = parsed.flags.has("c") || parsed.flags.has("complement");
  if (parsed.operands.length === 0) return err(ctx, "missing operand");

  const set1 = parseTrSet(parsed.operands[0], complement);
  const set2 = parsed.operands[1] !== undefined ? parseTrSet(parsed.operands[1], false) : null;
  const set2Chars = set2 ? Array.from(set2).sort((a, b) => a - b) : [];
  let out = "";
  let previous: number | null = null;
  for (const ch of Array.from(ctx.stdin)) {
    const code = ch.codePointAt(0) as number;
    if (del) {
      if (set1.has(code)) continue;
      out += ch;
      previous = code;
      continue;
    }
    if (set1.has(code)) {
      const target = set2Chars.length > 0 ? set2Chars[Math.min(set2Chars.length - 1, indexOfInSet(set1, code))] : code;
      if (squeeze && previous === target) continue;
      out += String.fromCodePoint(target);
      previous = target;
    } else {
      if (squeeze && previous === code) continue;
      out += ch;
      previous = code;
    }
  }
  return ok(out);
}

function indexOfInSet(set: Set<number>, code: number): number {
  const values = Array.from(set).sort((a, b) => a - b);
  const idx = values.indexOf(code);
  return idx < 0 ? 0 : idx;
}

interface SedCommand {
  start?: number | "regex" | "last";
  end?: number | "regex" | "last";
  regex?: RegExp;
  endRegex?: RegExp;
  command: "s" | "p" | "d" | "q" | "=";
  find?: RegExp;
  replace?: string;
  global?: boolean;
  print?: boolean;
  nth?: number;
}

function parseSedAddress(text: string, i: number): { address?: number | "regex" | "last"; regex?: RegExp; next: number } {
  if (text[i] === "$") return { address: "last", next: i + 1 };
  if (text[i] === "/") {
    let j = i + 1;
    let pattern = "";
    while (j < text.length && text[j] !== "/") {
      if (text[j] === "\\" && j + 1 < text.length) {
        pattern += text[j] + text[j + 1];
        j += 2;
      } else {
        pattern += text[j++];
      }
    }
    return { address: "regex", regex: new RegExp(pattern, "m"), next: j + 1 };
  }
  const match = /^\d+/.exec(text.slice(i));
  if (match) return { address: parseInt(match[0], 10), next: i + match[0].length };
  return { next: i };
}

function parseSedScript(script: string): SedCommand[] {
  const commands: SedCommand[] = [];
  let i = 0;
  while (i < script.length) {
    while (i < script.length && (script[i] === " " || script[i] === "\t" || script[i] === "\n" || script[i] === ";")) i++;
    if (i >= script.length) break;

    let start: SedCommand["start"];
    let regex: RegExp | undefined;
    const addr = parseSedAddress(script, i);
    if (addr.address !== undefined) {
      start = addr.address;
      regex = addr.regex;
      i = addr.next;
      if (script[i] === ",") {
        const second = parseSedAddress(script, i + 1);
        i = second.next;
        if (second.address !== undefined) {
          const commandText = script[i];
          commands.push({
            start,
            regex,
            end: second.address,
            endRegex: second.regex,
            command: commandText as SedCommand["command"],
          });
          // Range commands only support p/d with no arguments.
          i++;
          continue;
        }
      }
    }

    const commandChar = script[i];
    i++;
    if (commandChar === "s") {
      const delim = script[i++];
      let find = "";
      while (i < script.length && script[i] !== delim) {
        if (script[i] === "\\" && i + 1 < script.length) {
          find += script[i] + script[i + 1];
          i += 2;
        } else {
          find += script[i++];
        }
      }
      i++;
      let replace = "";
      while (i < script.length && script[i] !== delim) {
        if (script[i] === "\\" && i + 1 < script.length) {
          const next = script[i + 1];
          if (next === "/") replace += "/";
          else if (next === "n") replace += "\n";
          else if (next === "t") replace += "\t";
          else if (next === "&") replace += "\u0001";
          else if (next === "\\") replace += "\\";
          else replace += "\\" + next;
          i += 2;
        } else {
          replace += script[i++];
        }
      }
      i++;
      let flags = "";
      while (i < script.length && /[gipI0-9]/.test(script[i])) flags += script[i++];
      // `&` in a replacement means the whole match; `\&` is a literal ampersand.
      const jsReplacement = replace.replace(/&/g, "$$&").split("\u0001").join("&");
      commands.push({
        start,
        regex,
        command: "s",
        find: new RegExp(find, "m"),
        replace: jsReplacement,
        global: flags.indexOf("g") >= 0,
        print: flags.indexOf("p") >= 0,
        nth: parseInt(flags, 10) || undefined,
      });
    } else if (commandChar === "p" || commandChar === "d" || commandChar === "q" || commandChar === "=") {
      commands.push({ start, regex, command: commandChar });
    } else if (commandChar !== undefined) {
      throw new Error(`unknown command: '${commandChar}'`);
    }
  }
  return commands;
}

function runSed(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "nEi",
    shortValue: "e",
    longBool: ["quiet", "silent", "in-place"],
    longValue: ["expression"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const quiet = parsed.flags.has("n") || parsed.flags.has("quiet") || parsed.flags.has("silent");
  const inPlace = parsed.flags.has("i") || parsed.flags.has("in-place");
  const expressions: string[] = [];
  if (parsed.opts.has("e")) expressions.push(parsed.opts.get("e") as string);
  if (parsed.opts.has("expression")) expressions.push(parsed.opts.get("expression") as string);
  const operands = parsed.operands.slice();
  if (expressions.length === 0) {
    if (operands.length === 0) return err(ctx, "missing script");
    expressions.push(operands.shift() as string);
  }

  let commands: SedCommand[];
  try {
    commands = expressions.reduce<SedCommand[]>((acc, expr) => acc.concat(parseSedScript(expr)), []);
  } catch (error) {
    return err(ctx, error instanceof Error ? error.message : String(error), 2);
  }

  const files = operands.length > 0 ? operands : ["-"];
  let out = "";
  let errors = "";
  let code = 0;

  for (const file of files) {
    let content: string;
    if (file === "-") content = ctx.stdin;
    else {
      try {
        content = ctx.fs.readFile(file, ctx.shell.cwd).content;
      } catch (error) {
        errors += fsError(ctx, file, error, "can't read");
        code = 2;
        continue;
      }
    }
    const lines = splitLines(content);
    const output: string[] = [];
    let quit = false;

    let rangeActive = false;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      let line = lines[lineIndex];
      const lineNo = lineIndex + 1;
      let deleted = false;
      let printed = false;

      for (const cmd of commands) {
        let applies = false;
        if (cmd.start === undefined) {
          applies = true;
        } else if (typeof cmd.start === "number") {
          if (cmd.end !== undefined) {
            if (typeof cmd.end === "number") applies = lineNo >= cmd.start && lineNo <= cmd.end;
            else if (cmd.end === "last") applies = lineNo >= cmd.start;
            else applies = lineNo >= cmd.start;
          } else {
            applies = lineNo === cmd.start;
          }
        } else if (cmd.start === "last") {
          applies = lineIndex === lines.length - 1;
        } else if (cmd.start === "regex") {
          applies = cmd.regex!.test(line) || rangeActive;
          if (!rangeActive && cmd.end !== undefined && applies) rangeActive = true;
          if (rangeActive && cmd.end !== undefined) {
            if (cmd.end === "last" && lineIndex === lines.length - 1) rangeActive = false;
            else if (typeof cmd.end === "number" && lineNo >= cmd.end) rangeActive = false;
            else if (cmd.endRegex && cmd.endRegex.test(line)) rangeActive = false;
          }
        }
        if (!applies) continue;

        if (cmd.command === "s") {
          const find = cmd.find as RegExp;
          const replacement = cmd.replace ?? "";
          if (replacement === "") {
            line = line.replace(cmd.global ? new RegExp(find.source, "gm") : new RegExp(find.source, "m"), "");
          } else {
            line = line.replace(cmd.global ? new RegExp(find.source, "gm") : new RegExp(find.source, "m"), replacement);
          }
          if (cmd.print && !quiet) printed = true;
        } else if (cmd.command === "p") {
          printed = true;
        } else if (cmd.command === "d") {
          deleted = true;
        } else if (cmd.command === "q") {
          quit = true;
        } else if (cmd.command === "=") {
          output.push(String(lineNo));
        }
      }

      if (!deleted && (!quiet || printed)) output.push(line);
      if (quit) {
        output.push(line);
        break;
      }
    }

    const result = output.join("\n") + (output.length > 0 ? "\n" : "");
    if (inPlace && file !== "-") {
      try {
        ctx.fs.writeFile(file, ctx.shell.cwd, result);
      } catch (error) {
        errors += fsError(ctx, file, error, "can't write");
        code = 2;
      }
    } else {
      out += result;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runTee(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "a", longBool: ["append"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const append = parsed.flags.has("a") || parsed.flags.has("append");
  let errors = "";
  let code = 0;
  for (const file of parsed.operands) {
    try {
      ctx.fs.writeFile(file, ctx.shell.cwd, ctx.stdin, { append });
    } catch (error) {
      errors += fsError(ctx, file, error, "");
      code = 1;
    }
  }
  return { stdout: ctx.stdin, stderr: errors, code };
}

// ---------------------------------------------------------------------------
// Search / tree commands
// ---------------------------------------------------------------------------

function runFind(ctx: ExecContext): ExecResult {
  const args = ctx.args.slice();
  const roots: string[] = [];
  let i = 0;
  while (i < args.length && !args[i].startsWith("-") && args[i] !== "!" && args[i] !== "(") {
    roots.push(args[i]);
    i++;
  }
  if (roots.length === 0) roots.push(".");
  const expression = args.slice(i);

  let maxDepth = Infinity;
  let minDepth = 0;
  const filtered: string[] = [];
  for (let j = 0; j < expression.length; j++) {
    if (expression[j] === "-maxdepth") {
      maxDepth = parseInt(expression[j + 1], 10);
      j++;
    } else if (expression[j] === "-mindepth") {
      minDepth = parseInt(expression[j + 1], 10);
      j++;
    } else {
      filtered.push(expression[j]);
    }
  }

  type Test = (info: { node: FsNode; path: string; name: string; depth: number }) => boolean;
  // Parse a simple expression into RPN-ish arrays: AND/OR/NOT plus tests.
  const tokens = filtered;
  let k = 0;
  const parseOr = (): Array<{ op: "test" | "and" | "or" | "not"; test?: Test }> => {
    const out: Array<{ op: "test" | "and" | "or" | "not"; test?: Test }> = [];
    out.push(...parseAnd());
    while (tokens[k] === "-o" || tokens[k] === "-or") {
      k++;
      out.push(...parseAnd());
      out.push({ op: "or" });
    }
    return out;
  };
  const parseAnd = (): Array<{ op: "test" | "and" | "or" | "not"; test?: Test }> => {
    const out: Array<{ op: "test" | "and" | "or" | "not"; test?: Test }> = [];
    out.push(...parseUnary());
    while (k < tokens.length && tokens[k] !== "-o" && tokens[k] !== "-or" && tokens[k] !== ")") {
      if (tokens[k] === "-a" || tokens[k] === "-and") k++;
      if (k >= tokens.length || tokens[k] === "-o" || tokens[k] === "-or" || tokens[k] === ")") break;
      out.push(...parseUnary());
      out.push({ op: "and" });
    }
    return out;
  };
  const parseUnary = (): Array<{ op: "test" | "and" | "or" | "not"; test?: Test }> => {
    if (tokens[k] === "!") {
      k++;
      const inner = parseUnary();
      return inner.concat([{ op: "not" }]);
    }
    if (tokens[k] === "(") {
      k++;
      const inner = parseOr();
      if (tokens[k] === ")") k++;
      return inner;
    }
    const token = tokens[k++];
    if (token === undefined) return [];
    const arg = tokens[k++];
    let testFn: Test | null = null;
    if (token === "-name" || token === "-iname") {
      const insensitive = token === "-iname";
      const re = globToRegExp(arg ?? "");
      testFn = ({ name }) => (insensitive ? re.test(name.toLowerCase()) : re.test(name));
      if (insensitive) {
        const lowerRe = globToRegExp((arg ?? "").toLowerCase());
        testFn = ({ name }) => lowerRe.test(name.toLowerCase());
      }
    } else if (token === "-path" || token === "-ipath") {
      const re = globToRegExp(arg ?? "");
      testFn = ({ path }) => re.test(path);
    } else if (token === "-type") {
      testFn = ({ node }) => (arg === "f" ? node.isFile() : arg === "d" ? node.isDirectory() : arg === "l" ? node.isSymlink() : false);
    } else if (token === "-empty") {
      k--;
      testFn = ({ node }) => (node.isDirectory() ? node.children!.size === 0 : node.size() === 0);
    } else if (token === "-size") {
      const raw = arg ?? "";
      const match = /^([+-]?)(\d+)([ckMG]?)$/.exec(raw);
      if (!match) return [];
      const sign = match[1];
      let size = parseInt(match[2], 10);
      const unit = match[3];
      if (unit === "k") size *= 1024;
      else if (unit === "M") size *= 1024 * 1024;
      else if (unit === "G") size *= 1024 * 1024 * 1024;
      else if (unit === "") size *= 512;
      testFn = ({ node }) => (sign === "+" ? node.size() > size : sign === "-" ? node.size() < size : node.size() === size);
    } else if (token === "-perm") {
      const mode = parseOctalMode(arg ?? "");
      if (mode === null) return [];
      testFn = ({ node }) => (node.mode & 0o777) === mode;
    } else if (token === "-user") {
      testFn = ({ node }) => userFor(node.uid) === arg || String(node.uid) === arg;
    } else if (token === "-print" || token === "-print0") {
      k--;
      testFn = () => true;
    } else if (token === "-delete") {
      k--;
      testFn = () => true;
    } else if (token === "-prune" || token === "-quit") {
      k--;
      testFn = () => true;
    } else {
      return [];
    }
    return testFn ? [{ op: "test", test: testFn }] : [];
  };

  let program: Array<{ op: "test" | "and" | "or" | "not"; test?: Test }> = [];
  if (filtered.length > 0) {
    try {
      program = parseOr();
    } catch {
      return err(ctx, "invalid expression");
    }
  }
  if (program.length === 0) program = [{ op: "test", test: () => true }];

  const evaluate = (info: { node: FsNode; path: string; name: string; depth: number }): boolean => {
    const stack: boolean[] = [];
    for (const item of program) {
      if (item.op === "test") stack.push(item.test ? item.test(info) : false);
      else if (item.op === "not") stack.push(!(stack.pop() ?? false));
      else if (item.op === "and") {
        const b = stack.pop() ?? false;
        const a = stack.pop() ?? false;
        stack.push(a && b);
      } else if (item.op === "or") {
        const b = stack.pop() ?? false;
        const a = stack.pop() ?? false;
        stack.push(a || b);
      }
    }
    return stack.length > 0 ? stack[stack.length - 1] : true;
  };

  const deleteMode = filtered.indexOf("-delete") >= 0;
  const print0 = filtered.indexOf("-print0") >= 0;
  let out = "";
  let errors = "";
  let code = 0;

  const walk = (displayPath: string, depth: number) => {
    let resolved;
    try {
      resolved = ctx.fs.lstat(displayPath, ctx.shell.cwd, false);
    } catch (error) {
      errors += fsError(ctx, displayPath, error, "");
      code = 1;
      return;
    }
    const name = basename(displayPath) || displayPath;
    const info = { node: resolved.node, path: displayPath, name, depth };
    const matched = depth >= minDepth && depth <= maxDepth && evaluate(info);

    if (matched && !deleteMode) {
      out += displayPath + (print0 ? "\0" : "\n");
    }

    if (resolved.node.isDirectory() && depth < maxDepth && depth < 40) {
      try {
        ctx.fs.access(resolved.node, 4, displayPath);
        const names = ctx.fs.list(resolved.node, true);
        for (const child of names) walk(joinPath(displayPath, child), depth + 1);
      } catch (error) {
        errors += fsError(ctx, displayPath, error, "");
        code = 1;
      }
    }

    if (matched && deleteMode) {
      try {
        if (resolved.node.isDirectory()) ctx.fs.rmdir(displayPath, ctx.shell.cwd);
        else ctx.fs.unlink(displayPath, ctx.shell.cwd);
      } catch (error) {
        if (resolved.node.isDirectory()) {
          try {
            ctx.fs.removeTree(displayPath, ctx.shell.cwd);
          } catch (inner) {
            errors += fsError(ctx, displayPath, inner, "cannot delete");
            code = 1;
          }
        } else {
          errors += fsError(ctx, displayPath, error, "cannot delete");
          code = 1;
        }
      }
    }
  };

  for (const root of roots) walk(root, 0);
  return { stdout: out, stderr: errors, code };
}

function runTree(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "adf",
    shortValue: "L",
    longBool: ["all", "dirs-only", "full-path"],
    longValue: ["level"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const all = parsed.flags.has("a") || parsed.flags.has("all");
  const dirsOnly = parsed.flags.has("d") || parsed.flags.has("dirs-only");
  const levelSpec = parsed.opts.get("L") ?? parsed.opts.get("level");
  const maxDepth = levelSpec ? parseInt(levelSpec, 10) : Infinity;
  const root = parsed.operands[0] ?? ".";

  let dirs = 0;
  let files = 0;
  let errors = "";
  let out = "";

  const render = (path: string, display: string, prefix: string, depth: number): void => {
    let resolved;
    try {
      resolved = ctx.fs.resolve(path, ctx.shell.cwd);
    } catch (error) {
      errors += fsError(ctx, path, error, "");
      return;
    }
    if (!resolved.node.isDirectory()) return;
    if (depth >= maxDepth) return;

    let names = ctx.fs.list(resolved.node, all);
    if (dirsOnly) {
      names = names.filter((name) => resolved!.node.children!.get(name)!.isDirectory());
    }
    for (let i = 0; i < names.length && depth < 32; i++) {
      const name = names[i];
      const node = resolved.node.children!.get(name)!;
      const last = i === names.length - 1;
      const branch = last ? "└── " : "├── ";
      const color = node.isDirectory() ? C.bold + C.blue : node.isSymlink() ? C.cyan : "";
      const suffix = node.isDirectory() ? "/" : "";
      const label = color && ctx.tty ? color + name + suffix + C.reset : name + suffix;
      out += prefix + branch + label + "\n";
      if (node.isDirectory()) {
        dirs++;
        render(joinPath(path, name), "", prefix + (last ? "    " : "│   "), depth + 1);
      } else {
        files++;
      }
    }
    void display;
  };

  let rootResolved;
  try {
    rootResolved = ctx.fs.resolve(root, ctx.shell.cwd);
  } catch (error) {
    return fail(fsError(ctx, root, error, ""));
  }
  if (!rootResolved.node.isDirectory()) return err(ctx, `${root}: not a directory`, 1);

  out += paint(ctx, C.bold + C.blue, root) + "\n";
  render(root, root, "", 0);
  out += `\n${dirs} ${plural(dirs, "directory", "directories")}, ${files} ${plural(files, "file", "files")}\n`;
  return { stdout: out, stderr: errors, code: errors ? 1 : 0 };
}

function runDu(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "has",
    shortValue: "d",
    longBool: ["human-readable", "all", "summarize", "si"],
    longValue: ["max-depth"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const human = parsed.flags.has("h") || parsed.flags.has("human-readable");
  const all = parsed.flags.has("a") || parsed.flags.has("all");
  const summarize = parsed.flags.has("s") || parsed.flags.has("summarize");
  const depthSpec = parsed.opts.get("d") ?? parsed.opts.get("max-depth");
  const maxDepth = summarize ? 0 : depthSpec !== undefined ? parseInt(depthSpec, 10) : Infinity;
  const roots = parsed.operands.length > 0 ? parsed.operands : ["."];

  let out = "";
  let errors = "";
  let code = 0;

  const sizeOf = (node: FsNode, values: Map<FsNode, number>): number => {
    if (values.has(node)) return values.get(node) as number;
    if (!node.isDirectory()) {
      const size = node.size();
      values.set(node, size);
      return size;
    }
    let total = 4096;
    for (const name of ctx.fs.list(node, true)) {
      total += sizeOf(node.children!.get(name)!, values);
    }
    values.set(node, total);
    return total;
  };

  for (const root of roots) {
    let resolved;
    try {
      resolved = ctx.fs.resolve(root, ctx.shell.cwd);
    } catch (error) {
      errors += fsError(ctx, root, error, "");
      code = 1;
      continue;
    }
    const cache = new Map<FsNode, number>();
    const walk = (path: string, node: FsNode, depth: number) => {
      const size = sizeOf(node, cache);
      if (depth <= maxDepth || (all && !node.isDirectory())) {
        const value = human ? humanSize(size) : String(Math.ceil(size / 1024));
        out += `${value.padStart(human ? 6 : 8, " ")}\t${path}\n`;
      }
      if (node.isDirectory() && depth < maxDepth) {
        for (const name of ctx.fs.list(node, true)) {
          const child = node.children!.get(name)!;
          if (!all && !child.isDirectory() && depth + 1 > maxDepth) continue;
          walk(joinPath(path, name), child, depth + 1);
        }
      }
    };
    walk(root, resolved.node, 0);
  }
  return { stdout: out, stderr: errors, code };
}

function runDf(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "h", longBool: ["human-readable"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const human = parsed.flags.has("h") || parsed.flags.has("human-readable");
  const mounts = [
    { device: "/dev/nvme0n1p2", mount: "/", total: 476 * 1024, used: 188 * 1024, avail: 264 * 1024 },
    { device: "/dev/nvme0n1p3", mount: "/home", total: 476 * 1024, used: 92 * 1024, avail: 360 * 1024 },
    { device: "tmpfs", mount: "/tmp", total: 15 * 1024, used: 21, avail: 15 * 1024 },
    { device: "devtmpfs", mount: "/dev", total: 15 * 1024, used: 0, avail: 15 * 1024 },
    { device: "shm", mount: "/dev/shm", total: 15 * 1024, used: 0, avail: 15 * 1024 },
  ];
  const fmt = (n: number) => (human ? humanSize(n * 1024) : String(n));
  let out = "Filesystem      Size  Used Avail Use% Mounted on\n";
  for (const mount of mounts) {
    const percent = Math.round((mount.used / mount.total) * 100);
    out += `${mount.device.padEnd(15)} ${fmt(mount.total).padStart(5)} ${fmt(mount.used).padStart(5)} ${fmt(mount.avail).padStart(5)} ${String(percent).padStart(3)}% ${mount.mount}\n`;
  }
  return ok(out);
}

function runPs(ctx: ExecContext): ExecResult {
  const aux = ctx.args.some((arg) => arg === "aux" || arg === "-aux" || arg === "ax" || arg === "-ef");
  const processes = [
    { pid: 1, tty: "?", stat: "Ss", cpu: 0.0, mem: 0.1, vsz: 168432, rss: 11204, time: "0:02", command: "/nix/store/systemd/systemd --system" },
    { pid: 812, tty: "?", stat: "Ssl", cpu: 0.0, mem: 0.2, vsz: 235012, rss: 16400, time: "0:00", command: "NetworkManager --no-daemon" },
    { pid: 2041, tty: "?", stat: "Ss", cpu: 0.0, mem: 0.1, vsz: 15820, rss: 9216, time: "0:00", command: "sshd: /run/current-system/sw/bin/sshd" },
    { pid: 2099, tty: "pts/0", stat: "Ss", cpu: 0.1, mem: 0.1, vsz: 16220, rss: 10240, time: "0:00", command: "-bash" },
    { pid: 2175, tty: "pts/0", stat: "R+", cpu: 0.0, mem: 0.0, vsz: 9984, rss: 4096, time: "0:00", command: "ps aux" },
  ];
  if (aux) {
    let out = "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n";
    for (const process of processes) {
      out += `${process.pid === 2099 ? USER : "root"}     ${String(process.pid).padStart(5)} ${process.cpu.toFixed(1)} ${process.mem.toFixed(1)} ${String(process.vsz).padStart(6)} ${String(process.rss).padStart(5)} ${process.tty.padEnd(8)} ${process.stat} 09:14 ${process.time.padStart(6)} ${process.command}\n`;
    }
    return ok(out);
  }
  let out = "    PID TTY          TIME CMD\n";
  for (const process of processes) {
    out += `${String(process.pid).padStart(7)} ${process.tty.padEnd(8)} ${process.time.padStart(6)} ${process.command.split(" ")[0].split("/").pop()}\n`;
  }
  return ok(out);
}

function runFree(ctx: ExecContext): ExecResult {
  const human = ctx.args.indexOf("-h") >= 0 || ctx.args.indexOf("--human") >= 0;
  const values = human
    ? [
        ["Mem:", "31Gi", "6.9Gi", "8.3Gi", "6.0Gi", "20Gi", "8.0Gi"],
        ["Swap:", "8.0Gi", "0B", "8.0Gi"],
      ]
    : [
        ["Mem:", "32014820", "8143092", "11230544", "612344", "21439004", "8388604"],
        ["Swap:", "8388604", "0", "8388604"],
      ];
  let out = "               total        used        free      shared  buff/cache   available\n";
  out += `${values[0][0].padEnd(7)}${values[0].slice(1).map((v) => v.padStart(12)).join("")}\n`;
  out += `${values[1][0].padEnd(7)}${values[1].slice(1).map((v) => v.padStart(12)).join("")}\n`;
  return ok(out);
}

// ---------------------------------------------------------------------------
// Process / system information
// ---------------------------------------------------------------------------

function runUname(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, {
    shortBool: "asnrvmo",
    longBool: ["all", "kernel-name", "nodename", "kernel-release", "kernel-version", "machine", "operating-system"],
  });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const all = parsed.flags.has("a") || parsed.flags.has("all") || ctx.args.length === 0;
  const parts: string[] = [];
  if (all || parsed.flags.has("s") || parsed.flags.has("kernel-name")) parts.push("Linux");
  if (all || parsed.flags.has("n") || parsed.flags.has("nodename")) parts.push(HOSTNAME);
  if (all || parsed.flags.has("r") || parsed.flags.has("kernel-release")) parts.push("6.12.48");
  if (all || parsed.flags.has("v") || parsed.flags.has("kernel-version")) parts.push("#1-NixOS SMP PREEMPT_DYNAMIC Tue Oct 20 09:11:02 UTC 2026");
  if (all || parsed.flags.has("m") || parsed.flags.has("machine")) parts.push("x86_64");
  if (parsed.flags.has("o") || parsed.flags.has("operating-system")) parts.push("GNU/Linux");
  return ok(parts.join(" ") + "\n");
}

function formatDate(date: Date, format: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const pad = (n: number, width = 2) => String(n).padStart(width, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const offHours = pad(Math.floor(Math.abs(offset) / 60));
  const offMinutes = pad(Math.abs(offset) % 60);
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000) + 1;

  return format.replace(/%(.)/g, (all, key: string) => {
    switch (key) {
      case "Y": return String(date.getFullYear());
      case "y": return pad(date.getFullYear() % 100);
      case "m": return pad(date.getMonth() + 1);
      case "d": return pad(date.getDate());
      case "e": return String(date.getDate()).padStart(2, " ");
      case "H": return pad(date.getHours());
      case "I": return pad(date.getHours() % 12 || 12);
      case "M": return pad(date.getMinutes());
      case "S": return pad(date.getSeconds());
      case "p": return date.getHours() < 12 ? "AM" : "PM";
      case "a": return days[date.getDay()];
      case "A": return daysFull[date.getDay()];
      case "b": case "h": return months[date.getMonth()];
      case "B": return monthsFull[date.getMonth()];
      case "j": return pad(dayOfYear, 3);
      case "Z": return "UTC";
      case "z": return `${sign}${offHours}${offMinutes}`;
      case "s": return String(Math.floor(date.getTime() / 1000));
      case "F": return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      case "T": return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      case "R": return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
      case "D": return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${pad(date.getFullYear() % 100)}`;
      case "u": return String(date.getDay() === 0 ? 7 : date.getDay());
      case "w": return String(date.getDay());
      case "n": return "\n";
      case "t": return "\t";
      case "%": return "%";
      default: return all;
    }
  });
}

function runDate(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "uR", longBool: ["utc", "rfc-2822"], shortValue: "d", longValue: ["date"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const date = new Date();
  const format = parsed.operands[0];
  if (format && format.startsWith("+")) return ok(formatDate(date, format.slice(1)) + "\n");
  if (parsed.flags.has("R") || parsed.flags.has("rfc-2822")) {
    return ok(date.toUTCString().replace("GMT", "+0000") + "\n");
  }
  const text = date.toUTCString();
  const match = /^(\w{3}), (\d{2}) (\w{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/.exec(text);
  if (match) {
    return ok(`${match[1]} ${match[3]} ${match[2]} ${match[5]}:${match[6]}:${match[7]} UTC ${match[4]}\n`);
  }
  return ok(text + "\n");
}

function runUptime(): ExecResult {
  const now = new Date();
  const totalMinutes = 2 * 60 + 45;
  return ok(
    ` ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} up ${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")},  1 user,  load average: 0.42, 0.37, 0.31\n`,
  );
}

function runWhoami(ctx: ExecContext): ExecResult {
  if (ctx.args.length > 0) return err(ctx, "extra operand", 2);
  return ok(USER + "\n");
}

function runId(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "ugGnr", longBool: ["user", "group", "groups", "name", "real"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const name = (id: number) => (parsed.flags.has("n") || parsed.flags.has("name") ? userFor(id) : String(id));
  if (parsed.flags.has("u") || parsed.flags.has("user")) return ok(name(UID) + "\n");
  if (parsed.flags.has("g") || parsed.flags.has("group")) {
    return ok((parsed.flags.has("n") || parsed.flags.has("name") ? groupFor(UID) : String(UID)) + "\n");
  }
  if (parsed.flags.has("G") || parsed.flags.has("groups")) {
    return ok(
      `${name(1)} ${name(100)} ${name(UID)}\n`,
    );
  }
  return ok(`uid=${UID}(${USER}) gid=${UID}(${USER}) groups=1(wheel),100(users),${UID}(${USER})\n`);
}

function runHostname(): ExecResult {
  return ok(HOSTNAME + "\n");
}

function runNeofetch(ctx: ExecContext): ExecResult {
  const art = [
    "      ▄▄▄▄▄▄▄▄▄▄▄▄      ",
    "   ▄██████████████████▄   ",
    "  ██████████████████████  ",
    " ████████████████████████ ",
    " ███▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀████ ",
    " ███  ┌──────────────┐ ███ ",
    " ███  │  > _          │ ███ ",
    " ███  │               │ ███ ",
    " ███  │      NixOS    │ ███ ",
    " ███  └──────────────┘ ███ ",
    " ████████████████████████ ",
    "  ▀████████████████████▀  ",
    "   ▀██████████████████▀   ",
    "      ▀▀▀▀▀▀▀▀▀▀▀▀▀▀      ",
  ];
  const colors = [C.red, C.green, C.yellow, C.blue, C.magenta, C.cyan];
  const info = [
    `${paint(ctx, C.cyan + C.bold, USER)}@${paint(ctx, C.cyan + C.bold, HOSTNAME)}`,
    "-----------------------",
    `${paint(ctx, C.cyan, "OS")}: NixOS 25.11 (Xantusia) x86_64`,
    `${paint(ctx, C.cyan, "Host")}: ASUS ROG Zephyrus G14 (GA402XV)`,
    `${paint(ctx, C.cyan, "Kernel")}: 6.12.48`,
    `${paint(ctx, C.cyan, "Uptime")}: 2 hours, 45 mins`,
    `${paint(ctx, C.cyan, "Shell")}: bash (toy POSIX)`,
    `${paint(ctx, C.cyan, "Resolution")}: 1225x780 (three.js)`,
    `${paint(ctx, C.cyan, "DE")}: none — this is a laptop in a room`,
    `${paint(ctx, C.cyan, "Terminal")}: tmux 3.5a`,
    `${paint(ctx, C.cyan, "CPU")}: AMD Ryzen 9 7940HS (16) @ 5.2GHz`,
    `${paint(ctx, C.cyan, "GPU")}: AMD Radeon 780M / NVIDIA RTX 4060`,
    `${paint(ctx, C.cyan, "Memory")}: 10.2GiB / 31.2GiB`,
    "",
    colors.map((color) => paint(ctx, color, "███")).join(""),
  ];
  const height = Math.max(art.length, info.length);
  let out = "\n";
  for (let i = 0; i < height; i++) {
    const left = (art[i] ?? "").padEnd(art[0].length, " ");
    const color = i < art.length ? colors[i % colors.length] : "";
    const paintedArt = ctx.tty && color ? color + left + C.reset : left;
    out += paintedArt + "  " + (info[i] ?? "") + "\n";
  }
  return ok(out);
}

// ---------------------------------------------------------------------------
// Shell builtins
// ---------------------------------------------------------------------------

function runExport(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0 || ctx.args[0] === "-p") {
    return ok(
      Object.keys(ctx.env)
        .sort()
        .map((key) => `declare -x ${key}="${ctx.env[key]}"`)
        .join("\n") + "\n",
    );
  }
  for (const arg of ctx.args) {
    if (arg === "-n") continue;
    const eq = arg.indexOf("=");
    if (eq < 0) {
      if (ctx.env[arg] === undefined) ctx.env[arg] = "";
    } else {
      ctx.env[arg.slice(0, eq)] = arg.slice(eq + 1);
    }
  }
  return ok();
}

function runUnset(ctx: ExecContext): ExecResult {
  const names = ctx.args.filter((arg) => arg !== "-v" && arg !== "-f");
  for (const name of names) delete ctx.env[name];
  return ok();
}

function runSet(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0) {
    return ok(
      Object.keys(ctx.env)
        .sort()
        .map((key) => `${key}='${ctx.env[key]}'`)
        .join("\n") + "\n",
    );
  }
  return ok();
}

function runEnv(ctx: ExecContext): ExecResult {
  const args = ctx.args.slice();
  const env: Record<string, string> = { ...ctx.env };
  let i = 0;
  while (i < args.length) {
    if (args[i] === "-i" || args[i] === "--ignore-environment") {
      for (const key of Object.keys(env)) delete env[key];
      i++;
      continue;
    }
    if ((args[i] === "-u" || args[i] === "--unset") && i + 1 < args.length) {
      delete env[args[i + 1]];
      i += 2;
      continue;
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(args[i])) {
      const eq = args[i].indexOf("=");
      env[args[i].slice(0, eq)] = args[i].slice(eq + 1);
      i++;
      continue;
    }
    break;
  }
  if (i >= args.length) {
    return ok(
      Object.keys(env)
        .sort()
        .map((key) => `${key}=${env[key]}`)
        .join("\n") + "\n",
    );
  }
  const name = args[i];
  const command = COMMANDS[name];
  if (!command) return fail(`env: '${name}': No such file or directory\n`, 127);
  const result = command.run({
    ...ctx,
    name,
    argv: args.slice(i),
    args: args.slice(i + 1),
    env,
  });
  return { ...result, code: result.code ?? 0 };
}

function runAlias(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0) {
    return ok(
      Array.from(ctx.shell.aliases.keys())
        .sort()
        .map((name) => `alias ${name}='${ctx.shell.aliases.get(name)}'`)
        .join("\n") + "\n",
    );
  }
  let out = "";
  for (const arg of ctx.args) {
    const eq = arg.indexOf("=");
    if (eq >= 0) {
      ctx.shell.aliases.set(arg.slice(0, eq), arg.slice(eq + 1));
    } else {
      const value = ctx.shell.aliases.get(arg);
      if (value !== undefined) out += `alias ${arg}='${value}'\n`;
      else {
        return { stdout: out, stderr: `alias: ${arg}: not found\n`, code: 1 };
      }
    }
  }
  return ok(out);
}

function runUnalias(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0) return err(ctx, "usage: unalias name [name ...]");
  for (const name of ctx.args) ctx.shell.aliases.delete(name);
  return ok();
}

function runHistory(ctx: ExecContext): ExecResult {
  const args = ctx.args;
  if (args[0] === "-c") {
    ctx.shell.history.length = 0;
    return ok();
  }
  if (args[0] === "-d" && args[1] !== undefined) {
    const index = parseInt(args[1], 10) - 1;
    if (index >= 0 && index < ctx.shell.history.length) ctx.shell.history.splice(index, 1);
    return ok();
  }
  return ok(
    ctx.shell.history
      .map((line, index) => `${String(index + 1).padStart(5, " ")}  ${line}`)
      .join("\n") + "\n",
  );
}

function runWhich(ctx: ExecContext): ExecResult {
  const names = ctx.args.filter((arg) => arg !== "-a");
  if (names.length === 0) return err(ctx, "missing argument");
  let out = "";
  let code = 0;
  for (const name of names) {
    const found = findCommandPath(ctx, name);
    if (found) out += found + "\n";
    else code = 1;
  }
  return { stdout: out, code };
}

function runType(ctx: ExecContext): ExecResult {
  let out = "";
  let code = 0;
  for (const name of ctx.args) {
    if (ctx.shell.aliases.has(name)) {
      out += `${name} is aliased to \`${ctx.shell.aliases.get(name)}'\n`;
    } else if (COMMANDS[name]) {
      if (COMMANDS[name].builtin) out += `${name} is a shell builtin\n`;
      else {
        const path = findCommandPath(ctx, name);
        out += path ? `${name} is ${path}\n` : `${name} is a shell command\n`;
      }
    } else {
      const path = findCommandPath(ctx, name);
      if (path) out += `${name} is ${path}\n`;
      else {
        out += `bash: type: ${name}: not found\n`;
        code = 1;
      }
    }
  }
  return { stdout: out, code };
}

function runCommand(ctx: ExecContext): ExecResult {
  const args = ctx.args.slice();
  let mode: "v" | "V" | null = null;
  while (args.length > 0 && (args[0] === "-v" || args[0] === "-V")) {
    mode = args[0] === "-v" ? "v" : "V";
    args.shift();
  }
  if (args.length === 0) return ok();

  if (mode === "v") {
    let out = "";
    let code = 0;
    for (const name of args) {
      if (ctx.shell.aliases.has(name)) {
        out += `alias ${name}='${ctx.shell.aliases.get(name)}'\n`;
      } else if (COMMANDS[name]) {
        if (COMMANDS[name].builtin) out += name + "\n";
        else {
          const path = findCommandPath(ctx, name);
          if (path) out += path + "\n";
          else code = 1;
        }
      } else {
        const path = findCommandPath(ctx, name);
        if (path) out += path + "\n";
        else code = 1;
      }
    }
    return { stdout: out, code };
  }

  if (mode === "V") {
    let out = "";
    let code = 0;
    for (const name of args) {
      if (ctx.shell.aliases.has(name)) {
        out += `${name} is aliased to \`${ctx.shell.aliases.get(name)}'\n`;
      } else if (COMMANDS[name]) {
        const path = findCommandPath(ctx, name);
        out += COMMANDS[name].builtin
          ? `${name} is a shell builtin\n`
          : `${name} is ${path ?? name}\n`;
      } else {
        const path = findCommandPath(ctx, name);
        if (path) out += `${name} is ${path}\n`;
        else {
          out += `${name}: not found\n`;
          code = 1;
        }
      }
    }
    return { stdout: out, code };
  }

  const name = args[0];
  const spec = COMMANDS[name];
  if (!spec) return fail(`command: ${name}: not found\n`, 127);
  const result = spec.run({ ...ctx, name, argv: args, args: args.slice(1) });
  return { ...result, code: result.code ?? 0 };
}

function runTest(ctx: ExecContext, isBracket: boolean): ExecResult {
  let args = ctx.args.slice();
  if (isBracket) {
    if (args[args.length - 1] !== "]") return fail("[: missing `]'\n", 2);
    args = args.slice(0, -1);
  }
  let index = 0;

  const unary = (op: string, value: string): boolean => {
    switch (op) {
      case "-e": return ctx.fs.exists(value, ctx.shell.cwd);
      case "-f": {
        try { return ctx.fs.resolve(value, ctx.shell.cwd).node.isFile(); } catch { return false; }
      }
      case "-d": {
        try { return ctx.fs.resolve(value, ctx.shell.cwd).node.isDirectory(); } catch { return false; }
      }
      case "-L": case "-h": {
        try { return ctx.fs.lstat(value, ctx.shell.cwd, false).node.isSymlink(); } catch { return false; }
      }
      case "-r": {
        try { return ctx.fs.canAccess(ctx.fs.resolve(value, ctx.shell.cwd).node, 4); } catch { return false; }
      }
      case "-w": {
        try { return ctx.fs.canAccess(ctx.fs.resolve(value, ctx.shell.cwd).node, 2); } catch { return false; }
      }
      case "-x": {
        try { return ctx.fs.canAccess(ctx.fs.resolve(value, ctx.shell.cwd).node, 1); } catch { return false; }
      }
      case "-s": {
        try { return ctx.fs.resolve(value, ctx.shell.cwd).node.size() > 0; } catch { return false; }
      }
      case "-z": return value === "";
      case "-n": return value !== "";
      default: return false;
    }
  };

  const parseOr = (): boolean => {
    let value = parseAnd();
    while (args[index] === "-o" || args[index] === "||") {
      index++;
      const right = parseAnd();
      value = value || right;
    }
    return value;
  };
  const parseAnd = (): boolean => {
    let value = parseUnary();
    while (args[index] === "-a" || args[index] === "&&") {
      index++;
      const right = parseUnary();
      value = value && right;
    }
    return value;
  };
  const parseUnary = (): boolean => {
    const token = args[index++];
    if (token === undefined) return false;
    if (token === "!") return !parseUnary();
    if (token === "(") {
      const value = parseOr();
      if (args[index] === ")") index++;
      return value;
    }
    if (token.startsWith("-") && token.length === 2 && !/^-\d/.test(token)) {
      const value = args[index++];
      if (value === undefined) return false;
      return unary(token, value);
    }
    const op = args[index];
    if (op === "=" || op === "==" || op === "!=") {
      index++;
      const right = args[index++] ?? "";
      return op === "!=" ? token !== right : token === right;
    }
    if (op === "<" || op === ">") {
      index++;
      const right = args[index++] ?? "";
      return op === "<" ? token < right : token > right;
    }
    if (op === "-eq" || op === "-ne" || op === "-lt" || op === "-le" || op === "-gt" || op === "-ge") {
      index++;
      const right = args[index++] ?? "";
      const a = parseInt(token, 10);
      const b = parseInt(right, 10);
      switch (op) {
        case "-eq": return a === b;
        case "-ne": return a !== b;
        case "-lt": return a < b;
        case "-le": return a <= b;
        case "-gt": return a > b;
        case "-ge": return a >= b;
      }
    }
    return token !== "";
  };

  const result = parseOr();
  if (index < args.length) return fail(`${ctx.name}: too many arguments\n`, 2);
  return { code: result ? 0 : 1 };
}

function runRead(ctx: ExecContext): ExecResult {
  const noEscape = ctx.args.indexOf("-r") >= 0;
  const names = ctx.args.filter((arg) => arg !== "-r");
  if (names.length === 0) return err(ctx, "missing variable name");
  const line = ctx.stdin.split("\n")[0] ?? "";
  const value = noEscape ? line : line.replace(/\\(.)/g, "$1");
  const fields = value.trim() === "" ? [] : value.trim().split(/[ \t]+/);
  names.forEach((name, index) => {
    ctx.shell.env[name] =
      index === names.length - 1
        ? fields.slice(index).join(" ")
        : fields[index] ?? "";
  });
  return ok();
}

function runEval(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0) return ok();
  const result = ctx.shell.execute(ctx.args.join(" "), { recordHistory: false });
  return { stdout: result.stdout, stderr: result.stderr, code: result.code };
}

function runColon(): ExecResult {
  return { code: 0 };
}

function runExit(ctx: ExecContext): ExecResult {
  const code = ctx.args[0] !== undefined ? parseInt(ctx.args[0], 10) : ctx.shell.lastCode;
  const numeric = Number.isNaN(code) ? 0 : code & 0xff;
  ctx.shell.exit(numeric);
  return { code: numeric, exit: true };
}

function runHelp(ctx: ExecContext): ExecResult {
  const target = ctx.args[0];
  if (target !== undefined) {
    const spec = COMMANDS[target];
    if (!spec) return err(ctx, `no help topics match '${target}'`, 1);
    let out = paint(ctx, C.bold, `${spec.name} — ${spec.summary}`) + "\n\n";
    out += paint(ctx, C.cyan, "Usage:") + ` ${spec.usage}\n`;
    if (spec.flags && spec.flags.length > 0) {
      out += paint(ctx, C.cyan, "Options:") + ` ${spec.flags.join(", ")}\n`;
    }
    out += `\nType \`man ${spec.name}\` for the full page.\n`;
    return ok(out);
  }

  const groups: { title: string; names: string[] }[] = [
    {
      title: "Files",
      names: ["ls", "cd", "pwd", "mkdir", "rmdir", "rm", "touch", "mv", "cp", "ln", "chmod", "stat", "tree", "du", "df", "find"],
    },
    {
      title: "Text",
      names: ["cat", "head", "tail", "wc", "grep", "sort", "uniq", "cut", "tr", "sed", "tee", "echo", "printf", "rev", "nl"],
    },
    {
      title: "System",
      names: ["uname", "hostname", "whoami", "id", "date", "uptime", "ps", "free", "env", "export", "unset", "set", "read", "eval", ":", "history", "alias", "unalias", "which", "type", "command", "test", "true", "false", "seq", "yes", "clear", "help", "man", "exit"],
    },
    {
      title: "Fun",
      names: ["cowsay", "neofetch", "ssh"],
    },
  ];
  const seen = new Set<string>();
  let out = paint(ctx, C.bold + C.cyan, "amirsalar's laptop shell") + paint(ctx, C.gray, " — POSIX-ish, in a browser, on a laptop, in a room\n\n");
  for (const group of groups) {
    out += paint(ctx, C.bold + C.yellow, group.title) + "\n";
    for (const name of group.names) {
      const spec = COMMANDS[name];
      if (!spec) continue;
      seen.add(name);
      out += `  ${paint(ctx, C.green, name.padEnd(10))} ${paint(ctx, C.gray, spec.summary)}\n`;
    }
    out += "\n";
  }
  const rest = Object.keys(COMMANDS).filter((name) => !seen.has(name)).sort();
  if (rest.length > 0) {
    out += paint(ctx, C.bold + C.yellow, "More") + "\n";
    for (const name of rest) {
      out += `  ${paint(ctx, C.green, name.padEnd(10))} ${paint(ctx, C.gray, COMMANDS[name].summary)}\n`;
    }
    out += "\n";
  }
  out += paint(ctx, C.gray, "Tips: Tab completes, ↑/↓ walks history, Ctrl+R searches it, Ctrl+L clears.\n");
  return ok(out);
}

function runMan(ctx: ExecContext): ExecResult {
  const target = ctx.args[0];
  if (target === undefined) return err(ctx, "What manual page do you want?");
  const spec = COMMANDS[target];
  if (!spec) return fail(`No manual entry for ${target}\n`, 16);
  const flags = spec.flags ?? [];
  let out = paint(ctx, C.bold, `${spec.name.toUpperCase()}(1)`) + "        User Commands        " + paint(ctx, C.bold, `${spec.name.toUpperCase()}(1)`);
  out += "\n\n" + paint(ctx, C.bold, "NAME") + "\n";
  out += `       ${spec.name} - ${spec.summary}\n\n`;
  out += paint(ctx, C.bold, "SYNOPSIS") + "\n";
  out += `       ${spec.usage}\n\n`;
  out += paint(ctx, C.bold, "DESCRIPTION") + "\n";
  out += `       ${spec.summary} This is a toy implementation: it operates on the\n`;
  out += "       in-browser filesystem that lives inside the laptop.\n\n";
  if (flags.length > 0) {
    out += paint(ctx, C.bold, "OPTIONS") + "\n";
    for (const flag of flags) out += `       ${flag}\n`;
    out += "\n";
  }
  out += paint(ctx, C.bold, "SEE ALSO") + "\n";
  out += "       help(1), man(1)\n";
  return ok(out);
}

function runSeq(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortValue: "s", longValue: ["separator"], shortBool: "w" });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const separator = parsed.opts.get("s") ?? parsed.opts.get("separator") ?? "\n";
  const operands = parsed.operands.map(Number);
  if (operands.some((n) => Number.isNaN(n)) || operands.length === 0 || operands.length > 3) {
    return err(ctx, "invalid arguments");
  }
  let first = 1;
  let increment = 1;
  let last: number;
  if (operands.length === 1) last = operands[0];
  else if (operands.length === 2) {
    first = operands[0];
    last = operands[1];
  } else {
    first = operands[0];
    increment = operands[1];
    last = operands[2];
  }
  if (increment === 0) return err(ctx, "invalid Zero increment value");
  const values: string[] = [];
  const width = parsed.flags.has("w") ? Math.max(String(first).length, String(last).length) : 0;
  const decimals = Math.max(
    (String(first).split(".")[1] ?? "").length,
    (String(increment).split(".")[1] ?? "").length,
    (String(last).split(".")[1] ?? "").length,
  );
  for (let value = first; increment > 0 ? value <= last + 1e-9 : value >= last - 1e-9; value += increment) {
    values.push(value.toFixed(decimals).padStart(width, "0"));
    if (values.length >= 1000) break;
  }
  return ok(values.join(separator) + (values.length > 0 ? separator === "\n" ? "\n" : "\n" : ""));
}

function runYes(ctx: ExecContext): ExecResult {
  const text = ctx.args.join(" ") || "y";
  // A real yes never stops; cap it so the browser stays responsive.
  return ok((text + "\n").repeat(200));
}

function runRev(ctx: ExecContext): ExecResult {
  const input = inputLines(ctx, ctx.args);
  let out = "";
  for (const part of input.parts) {
    const lines = splitLines(part);
    for (const line of lines) out += Array.from(line).reverse().join("") + "\n";
  }
  return { stdout: out, stderr: input.errors, code: input.code };
}

function runNl(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "ba", longBool: ["number-all", "number-nonblank"] });
  if (parsed.error) return fail(`${ctx.name}: ${parsed.error}\n`, 2);
  const numberAll = parsed.flags.has("a") || parsed.flags.has("number-all");
  const input = inputLines(ctx, parsed.operands);
  let out = "";
  let n = 0;
  for (const part of input.parts) {
    for (const line of splitLines(part)) {
      const blank = line.trim() === "";
      if (!blank || numberAll) out += `${String(++n).padStart(6, " ")}\t${line}\n`;
      else out += "      \t" + line + "\n";
    }
  }
  return { stdout: out, stderr: input.errors, code: input.code };
}

function runCowsay(ctx: ExecContext): ExecResult {
  const text = ctx.args.join(" ") || "moo";
  return ok(say({ text }) + "\n");
}

function runSsh(ctx: ExecContext): ExecResult {
  const args = ctx.args.filter((arg) => !arg.startsWith("-"));
  const host = "ssh.amirsalarsafaei.com";
  const target = (args[0] ?? "").replace(/^.*@/, "");
  if (target && !target.includes("amirsalarsafaei.com")) {
    return {
      stderr: `ssh: Could not resolve hostname ${target}: Name or service not known\nthis is a 3D toy shell — try: ssh ${host}\n`,
      code: 255,
    };
  }
  return ok(
    "This laptop is just for show. The real site runs as a full\n" +
      "terminal UI over SSH — blogs, about-me, and now-playing with\n" +
      "album art, right in your terminal:\n\n" +
      `    $ ssh ${host}\n\n` +
      "Open a real terminal and run it — works from anywhere.\n",
  );
}

function runClear(ctx: ExecContext): ExecResult {
  if (ctx.args.length > 0) return err(ctx, "too many arguments");
  return { clear: true, code: 0 };
}

function runTrue(): ExecResult {
  return { code: 0 };
}

function runFalse(): ExecResult {
  return { code: 1 };
}

function runBasename(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortValue: "s", longValue: ["suffix"] });
  if (parsed.error) return fail(`${ctx.name}: ${parsed.error}\n`, 2);
  if (parsed.operands.length === 0) return err(ctx, "missing operand");

  const explicitSuffix = parsed.opts.get("s") ?? parsed.opts.get("suffix");
  // POSIX form: basename STRING [SUFFIX].
  if (explicitSuffix === undefined && parsed.operands.length === 2) {
    let name = basename(parsed.operands[0]);
    const suffix = parsed.operands[1];
    if (suffix && name !== suffix && name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
    }
    return ok(name + "\n");
  }

  const suffix = explicitSuffix ?? "";
  return ok(
    parsed.operands
      .map((operand) => {
        let name = basename(operand);
        if (suffix && name !== suffix && name.endsWith(suffix)) name = name.slice(0, -suffix.length);
        return name;
      })
      .join("\n") + "\n",
  );
}

function runDirname(ctx: ExecContext): ExecResult {
  if (ctx.args.length === 0) return err(ctx, "missing operand");
  return ok(ctx.args.map((arg) => dirname(arg)).join("\n") + "\n");
}

function runRealpath(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "em", longBool: ["canonicalize-existing", "canonicalize-missing"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const allowMissing = parsed.flags.has("m") || parsed.flags.has("canonicalize-missing");
  const requireExisting = parsed.flags.has("e") || parsed.flags.has("canonicalize-existing");
  if (parsed.operands.length === 0) return err(ctx, "missing operand");
  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    try {
      if (allowMissing) {
        out += ctx.fs.resolve(operand, ctx.shell.cwd).path + "\n";
      } else {
        const resolved = ctx.fs.resolve(operand, ctx.shell.cwd);
        if (requireExisting) out += resolved.path + "\n";
        else out += resolved.path + "\n";
      }
    } catch (error) {
      errors += fsError(ctx, operand, error, "");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

function runReadlink(ctx: ExecContext): ExecResult {
  const parsed = parseArgs(ctx.args, { shortBool: "fn", longBool: ["canonicalize", "no-newline"] });
  const optionFailure = optionError(ctx, parsed);
  if (optionFailure) return optionFailure;
  const canonical = parsed.flags.has("f") || parsed.flags.has("canonicalize");
  const noNewline = parsed.flags.has("n") || parsed.flags.has("no-newline");
  if (parsed.operands.length === 0) return err(ctx, "missing operand");
  let out = "";
  let errors = "";
  let code = 0;
  for (const operand of parsed.operands) {
    try {
      if (canonical) {
        out += ctx.fs.resolve(operand, ctx.shell.cwd).path;
      } else {
        const entry = ctx.fs.lstat(operand, ctx.shell.cwd, false).node;
        if (entry.isSymlink()) out += entry.target ?? "";
        else {
          errors += `${ctx.name}: ${operand}: Invalid argument\n`;
          code = 1;
        }
      }
      if (!noNewline) out += "\n";
    } catch (error) {
      errors += fsError(ctx, operand, error, "");
      code = 1;
    }
  }
  return { stdout: out, stderr: errors, code };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

function spec(
  name: string,
  summary: string,
  usage: string,
  run: (ctx: ExecContext) => ExecResult,
  extra: Partial<CommandSpec> = {},
): CommandSpec {
  return { name, summary, usage, run, ...extra };
}

export const COMMANDS: Record<string, CommandSpec> = {};

const registry: CommandSpec[] = [
  // files
  spec("ls", "list directory contents", "ls [-laAhRrStF1din] [FILE...]", runLs, { flags: ["-a, --all", "-A, --almost-all", "-l, --long", "-h, --human-readable", "-R, --recursive", "-r, --reverse", "-t", "-S", "-F, --classify", "-d, --directory", "-i, --inode", "-n"] }),
  spec("cd", "change the working directory", "cd [-L|-P] [DIR]", runCd, { builtin: true, flags: ["-L", "-P"] }),
  spec("pwd", "print the working directory", "pwd [-L|-P]", runPwd, { builtin: true, flags: ["-L", "-P"] }),
  spec("mkdir", "create directories", "mkdir [-pv] [-m MODE] DIRECTORY...", runMkdir, { flags: ["-p, --parents", "-v, --verbose", "-m, --mode=MODE"] }),
  spec("rmdir", "remove empty directories", "rmdir [-pv] DIRECTORY...", runRmdir, { flags: ["-p, --parents", "-v, --verbose"] }),
  spec("rm", "remove files or directories", "rm [-rRfdv] FILE...", runRm, { flags: ["-r, -R, --recursive", "-f, --force", "-d, --dir", "-v, --verbose"] }),
  spec("touch", "create files and update timestamps", "touch [-amcv] FILE...", runTouch, { flags: ["-a", "-m", "-c, --no-create", "-v, --verbose"] }),
  spec("mv", "move or rename files", "mv [-fnv] SOURCE... DEST", runMv, { flags: ["-f, --force", "-n, --no-clobber", "-v, --verbose", "-t, --target-directory=DIR"] }),
  spec("cp", "copy files and directories", "cp [-rRfnvpa] SOURCE... DEST", runCp, { flags: ["-r, -R, --recursive", "-n, --no-clobber", "-v, --verbose", "-p, --preserve", "-a, --archive"] }),
  spec("ln", "create hard or symbolic links", "ln [-sfnv] TARGET LINK_NAME", runLn, { flags: ["-s, --symbolic", "-f, --force", "-n, --no-dereference", "-v, --verbose"] }),
  spec("chmod", "change file modes", "chmod [-R] MODE FILE...", runChmod, { flags: ["-R, --recursive", "-v, --verbose"] }),
  spec("stat", "display file status", "stat [-Lt] [-c FORMAT] FILE...", runStat, { flags: ["-L, --dereference", "-t, --terse", "-c, --format=FORMAT"] }),
  spec("tree", "list contents of directories in a tree", "tree [-adf] [-L LEVEL] [DIR]", runTree, { flags: ["-a, --all", "-d, --dirs-only", "-L, --level=N", "-f, --full-path"] }),
  spec("du", "estimate file space usage", "du [-has] [-d DEPTH] [FILE...]", runDu, { flags: ["-h, --human-readable", "-a, --all", "-s, --summarize", "-d, --max-depth=N"] }),
  spec("df", "report filesystem space usage", "df [-h]", runDf, { flags: ["-h, --human-readable"] }),

  // text
  spec("cat", "concatenate and print files", "cat [-nbsETAv] [FILE...]", runCat, { flags: ["-n, --number", "-b, --number-nonblank", "-s, --squeeze-blank", "-E, --show-ends", "-T, --show-tabs", "-A, --show-all"] }),
  spec("echo", "write arguments to standard output", "echo [-neE] [STRING...]", runEcho, { flags: ["-n", "-e", "-E"] }),
  spec("printf", "format and print data", "printf FORMAT [ARGUMENT...]", runPrintf),
  spec("head", "print the first lines of files", "head [-qv] [-n N] [-c N] [FILE...]", runHead, { flags: ["-n, --lines=N", "-c, --bytes=N", "-q, --quiet", "-v, --verbose"] }),
  spec("tail", "print the last lines of files", "tail [-qv] [-n N] [-c N] [FILE...]", runTail, { flags: ["-n, --lines=N", "-c, --bytes=N", "-q, --quiet", "-v, --verbose"] }),
  spec("wc", "count lines, words and bytes", "wc [-lwcmL] [FILE...]", runWc, { flags: ["-l, --lines", "-w, --words", "-c, --bytes", "-m, --chars", "-L, --max-line-length"] }),
  spec("grep", "search text for patterns", "grep [-ivnclLqEFwxohHr] PATTERN [FILE...]", runGrep, { flags: ["-i, --ignore-case", "-v, --invert-match", "-n, --line-number", "-c, --count", "-l, --files-with-matches", "-L, --files-without-match", "-r, --recursive", "-E, --extended-regexp", "-F, --fixed-strings", "-w, --word-regexp", "-x, --line-regexp", "-o, --only-matching", "-q, --quiet"] }),
  spec("sort", "sort lines of text", "sort [-rnufb] [-k N] [-t SEP] [FILE...]", runSort, { flags: ["-r, --reverse", "-n, --numeric-sort", "-u, --unique", "-f, --ignore-case", "-k, --key=N", "-t, --field-separator=SEP"] }),
  spec("uniq", "report or filter repeated lines", "uniq [-cdui] [INPUT [OUTPUT]]", runUniq, { flags: ["-c, --count", "-d, --repeated", "-u, --unique", "-i, --ignore-case"] }),
  spec("cut", "select fields or characters from lines", "cut -d SEP -f LIST [FILE...]", runCut, { flags: ["-d, --delimiter=SEP", "-f, --fields=LIST", "-c, --characters=LIST", "-s, --only-delimited"] }),
  spec("tr", "translate or delete characters", "tr [-dsc] SET1 [SET2]", runTr, { flags: ["-d, --delete", "-s, --squeeze-repeats", "-c, --complement"] }),
  spec("sed", "stream editor", "sed [-nEi] SCRIPT [FILE...]", runSed, { flags: ["-n, --quiet", "-e, --expression=SCRIPT", "-i, --in-place"] }),
  spec("tee", "copy input to files and stdout", "tee [-a] [FILE...]", runTee, { flags: ["-a, --append"] }),
  spec("rev", "reverse lines character-wise", "rev [FILE...]", runRev),
  spec("nl", "number lines of files", "nl [-ba] [FILE...]", runNl, { flags: ["-b, --number-nonblank", "-a, --number-all"] }),

  // search
  spec("find", "search for files in a directory hierarchy", "find [PATH...] [-name PATTERN] [-type fdl] [EXPRESSION]", runFind, { flags: ["-name PATTERN", "-iname PATTERN", "-type f|d|l", "-maxdepth N", "-mindepth N", "-size N", "-empty", "-delete", "-print", "-print0"] }),

  // system
  spec("uname", "print system information", "uname [-asnrvmo]", runUname, { flags: ["-a, --all", "-s, --kernel-name", "-n, --nodename", "-r, --kernel-release", "-v, --kernel-version", "-m, --machine", "-o, --operating-system"] }),
  spec("hostname", "print the host name", "hostname", runHostname),
  spec("whoami", "print the current user name", "whoami", runWhoami),
  spec("id", "print user and group ids", "id [-ugGnr]", runId, { flags: ["-u, --user", "-g, --group", "-G, --groups", "-n, --name"] }),
  spec("date", "print the current date and time", "date [+FORMAT]", runDate, { flags: ["+FORMAT"] }),
  spec("uptime", "show how long the system has been running", "uptime", runUptime),
  spec("ps", "report process status", "ps [aux]", runPs, { flags: ["aux", "-ef"] }),
  spec("free", "display memory usage", "free [-h]", runFree, { flags: ["-h, --human"] }),
  spec("env", "print the environment or run a command", "env [-i] [-u NAME] [NAME=VALUE...] [COMMAND [ARG...]]", runEnv, { flags: ["-i, --ignore-environment", "-u, --unset=NAME"] }),
  spec("export", "set export attribute for shell variables", "export [-p] [NAME[=VALUE]...]", runExport, { builtin: true }),
  spec("unset", "remove shell variables", "unset [-v] NAME...", runUnset, { builtin: true }),
  spec("set", "set or print shell variables", "set", runSet, { builtin: true }),
  spec("read", "read a line from standard input", "read [-r] NAME...", runRead, { builtin: true }),
  spec("eval", "evaluate arguments as a shell command", "eval [ARG...]", runEval, { builtin: true }),
  spec(":", "do nothing, successfully", ":", runColon, { builtin: true }),
  spec("alias", "define or display aliases", "alias [NAME[=VALUE]...]", runAlias, { builtin: true }),
  spec("unalias", "remove alias definitions", "unalias NAME...", runUnalias, { builtin: true }),
  spec("history", "display or manipulate command history", "history [-c] [-d N]", runHistory, { builtin: true }),
  spec("which", "locate a command", "which [-a] NAME...", runWhich),
  spec("type", "describe how a name would be interpreted", "type NAME...", runType, { builtin: true }),
  spec("command", "run a command bypassing functions", "command [-v|-V] NAME [ARG...]", runCommand, { builtin: true }),
  spec("test", "evaluate a conditional expression", "test EXPRESSION", (ctx) => runTest(ctx, false), { builtin: true }),
  spec("[", "evaluate a conditional expression", "[ EXPRESSION ]", (ctx) => runTest(ctx, true), { builtin: true }),
  spec("true", "do nothing, successfully", "true", runTrue, { builtin: true }),
  spec("false", "do nothing, unsuccessfully", "false", runFalse, { builtin: true }),
  spec("seq", "print a sequence of numbers", "seq [-s SEP] [FIRST [INCREMENT]] LAST", runSeq, { flags: ["-s, --separator=SEP", "-w"] }),
  spec("yes", "output a string repeatedly", "yes [STRING...]", runYes),
  spec("clear", "clear the terminal screen", "clear", runClear, { builtin: true }),
  spec("exit", "exit the shell", "exit [N]", runExit, { builtin: true }),
  spec("logout", "exit the shell", "logout", runExit, { builtin: true }),
  spec("help", "list commands or describe one", "help [COMMAND]", runHelp, { builtin: true }),
  spec("man", "display the manual page for a command", "man COMMAND", runMan, { builtin: true }),
  spec("basename", "strip directory and suffix from names", "basename [-s SUFFIX] NAME...", runBasename),
  spec("dirname", "strip the last component from names", "dirname NAME...", runDirname),
  spec("realpath", "print resolved absolute paths", "realpath [-em] NAME...", runRealpath),
  spec("readlink", "print symbolic link targets", "readlink [-fn] NAME...", runReadlink),

  // fun
  spec("cowsay", "a cow says what you tell it", "cowsay [STRING...]", runCowsay),
  spec("neofetch", "show off the system", "neofetch", runNeofetch),
  spec("ssh", "connect to the real site", "ssh [USER@]HOST", runSsh),
];

for (const command of registry) {
  COMMANDS[command.name] = command;
}

export const COMMAND_NAMES = registry.map((command) => command.name);

export function commandSummary(name: string): string {
  return COMMANDS[name]?.summary ?? "";
}
