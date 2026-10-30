// Tab completion + type-ahead suggestions for the laptop shell.
//
// The scanner is deliberately tolerant: it runs on every keystroke, so an
// unterminated quote must not throw. It only needs to know where the current
// word starts and whether that word is a command or an argument.

import { FsNode } from "./fs";
import { COMMANDS, COMMAND_NAMES } from "./commands";
import { HOME } from "./defaultFileSystem";
import type { Shell } from "./shell";

export type SuggestionKind =
  | "command"
  | "alias"
  | "history"
  | "option"
  | "file"
  | "directory"
  | "variable";

export interface Suggestion {
  /** Text that replaces the current token. */
  value: string;
  label: string;
  hint?: string;
  kind: SuggestionKind;
  appendSpace: boolean;
}

export interface CompletionResult {
  suggestions: Suggestion[];
  /** Token start offset (replacement range). */
  start: number;
  /** Token end offset (may be past the caret, for mid-word completion). */
  end: number;
  /** Remaining suffix of the best suggestion, for the inline ghost. */
  ghost: string;
}

interface Span {
  text: string;
  start: number;
  end: number;
  op: boolean;
  quoted: boolean;
}

const SEPARATORS = ["|", ";", "&&", "||", "&"];
const REDIRECTIONS = ["<", ">", ">>", "2>", "2>>", "&>", "&>>", ">&1", ">&2", "2>&1", "1>&2"];

function scanLine(line: string): Span[] {
  const spans: Span[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      continue;
    }
    if ("|&;<>".indexOf(ch) >= 0) {
      let end = i + 1;
      if ((ch === "|" || ch === "&" || ch === ">") && line[i + 1] === ch) end++;
      if (ch === ">" && line[i + 1] === "&") end += 2;
      if (ch === "&" && line[i + 1] === ">") {
        end = i + 2;
        if (line[i + 2] === ">") end++;
      }
      spans.push({ text: line.slice(i, end), start: i, end, op: true, quoted: false });
      i = end;
      continue;
    }

    const start = i;
    let text = "";
    let quoted = false;
    let quote: string | null = null;
    while (i < line.length) {
      const c = line[i];
      if (quote) {
        if (c === quote) {
          quote = null;
          quoted = true;
          i++;
        } else {
          text += c;
          i++;
        }
        continue;
      }
      if (c === "'" || c === '"') {
        quote = c;
        quoted = true;
        i++;
        continue;
      }
      if (c === "\\" && i + 1 < line.length) {
        text += line[i + 1];
        i += 2;
        continue;
      }
      if (c === " " || c === "\t" || c === "\r" || "|&;<>".indexOf(c) >= 0) break;
      text += c;
      i++;
    }
    spans.push({ text, start, end: i, op: false, quoted });
  }
  return spans;
}

function isAssignment(text: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*=/.test(text);
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function splitFlags(spec: string[] | undefined): { value: string; label: string; hint: string }[] {
  if (!spec) return [];
  const flags: { value: string; label: string; hint: string }[] = [];
  for (const entry of spec) {
    for (const piece of entry.split(/,\s*/)) {
      const trimmed = piece.trim();
      if (!trimmed.startsWith("-")) continue;
      const eq = trimmed.indexOf("=");
      if (eq >= 0) {
        const name = trimmed.slice(0, eq + 1);
        flags.push({ value: name, label: name, hint: trimmed.slice(eq + 1) });
      } else {
        flags.push({ value: trimmed, label: trimmed, hint: "" });
      }
    }
  }
  return flags;
}

function pathSuggestions(
  shell: Shell,
  token: string,
  dirsOnly: boolean,
): Suggestion[] {
  if (token === "~") {
    return [
      {
        value: "~/",
        label: "~/",
        hint: "home directory",
        kind: "directory",
        appendSpace: false,
      },
    ];
  }

  let baseDisplay = "";
  let prefix = token;
  const slash = token.lastIndexOf("/");
  if (slash >= 0) {
    baseDisplay = token.slice(0, slash + 1);
    prefix = token.slice(slash + 1);
  }

  const home = shell.env.HOME ?? HOME;
  const resolveBase =
    baseDisplay === ""
      ? "."
      : baseDisplay.startsWith("~/")
        ? home + baseDisplay.slice(1)
        : baseDisplay;

  let node: FsNode;
  try {
    const resolved = shell.fs.resolve(resolveBase, shell.cwd);
    if (!resolved.node.isDirectory()) return [];
    node = resolved.node;
  } catch {
    return [];
  }

  const includeHidden = prefix.startsWith(".");
  let names: string[];
  try {
    names = shell.fs.list(node, includeHidden);
  } catch {
    return [];
  }

  const suggestions: Suggestion[] = [];
  for (const name of names) {
    if (!name.startsWith(prefix)) continue;
    const child = node.children!.get(name)!;
    if (dirsOnly && !child.isDirectory()) continue;
    const isDir = child.isDirectory();
    const value = baseDisplay + name + (isDir ? "/" : "");
    const hint = isDir
      ? "directory"
      : child.isSymlink()
        ? "link"
        : humanSize(child.size());
    suggestions.push({
      value,
      label: name + (isDir ? "/" : ""),
      hint,
      kind: isDir ? "directory" : "file",
      appendSpace: !isDir,
    });
    if (suggestions.length >= 16) break;
  }

  suggestions.sort((a, b) => {
    const aDir = a.kind === "directory" ? 0 : 1;
    const bDir = b.kind === "directory" ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.label.localeCompare(b.label, "en");
  });
  return suggestions;
}

function commandSuggestions(shell: Shell, token: string): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const seen = new Set<string>();

  for (const name of COMMAND_NAMES) {
    if (!name.startsWith(token)) continue;
    seen.add(name);
    suggestions.push({
      value: name,
      label: name,
      hint: COMMANDS[name]?.summary ?? "",
      kind: "command",
      appendSpace: true,
    });
  }

  for (const [name, value] of Array.from(shell.aliases.entries())) {
    if (!name.startsWith(token) || seen.has(name)) continue;
    seen.add(name);
    suggestions.push({
      value: name,
      label: name,
      hint: "→ " + value,
      kind: "alias",
      appendSpace: true,
    });
  }

  // History: only when this is the whole line, so replacing the token with a
  // full previous command is unambiguous.
  for (let i = shell.history.length - 1; i >= 0; i--) {
    const entry = shell.history[i];
    if (entry === token) continue;
    if (!entry.startsWith(token)) continue;
    if (suggestions.some((suggestion) => suggestion.value === entry)) continue;
    suggestions.push({
      value: entry,
      label: entry,
      hint: "history",
      kind: "history",
      appendSpace: false,
    });
    if (suggestions.length >= 18) break;
  }

  return suggestions.slice(0, 16);
}

function optionSuggestions(command: string, token: string): Suggestion[] {
  const spec = COMMANDS[command];
  if (!spec) return [];
  const flags = splitFlags(spec.flags);
  const suggestions: Suggestion[] = [];
  for (const flag of flags) {
    if (!flag.value.startsWith(token)) continue;
    suggestions.push({
      value: flag.value,
      label: flag.label,
      hint: flag.hint,
      kind: "option",
      appendSpace: flag.value.endsWith("="),
    });
  }
  return suggestions.slice(0, 16);
}

function variableSuggestions(shell: Shell, token: string): Suggestion[] {
  const prefix = token.startsWith("${") ? token.slice(2) : token.slice(1);
  const wrap = (name: string): string => (token.startsWith("${") ? "${" + name + "}" : "$" + name);
  const suggestions: Suggestion[] = [];
  const specials = ["?", "$", "!", "#", "0"];
  for (const name of specials) {
    if (!name.startsWith(prefix)) continue;
    suggestions.push({
      value: wrap(name),
      label: wrap(name),
      hint: "special",
      kind: "variable",
      appendSpace: true,
    });
  }
  for (const name of Object.keys(shell.env).sort()) {
    if (!name.startsWith(prefix)) continue;
    suggestions.push({
      value: wrap(name),
      label: wrap(name),
      hint: shell.env[name].slice(0, 48),
      kind: "variable",
      appendSpace: true,
    });
    if (suggestions.length >= 16) break;
  }
  return suggestions;
}

export function complete(shell: Shell, line: string, caret: number): CompletionResult {
  const spans = scanLine(line);
  const clamped = Math.max(0, Math.min(caret, line.length));

  let current: Span | null = null;
  for (const span of spans) {
    if (!span.op && span.start <= clamped && clamped <= span.end) current = span;
  }

  const start = current ? current.start : clamped;
  const end = current ? current.end : clamped;
  const token = line.slice(start, clamped);

  // Which command are we in?
  let separator = -1;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i];
    if (span.op && span.end <= start && SEPARATORS.indexOf(span.text) >= 0) separator = i;
  }
  const context = spans.slice(separator + 1).filter((span) => !span.op && span.start < clamped);
  const wordsBefore = context.filter((span) => span !== current);

  let previous: Span | null = null;
  for (const span of spans) {
    if (span.end <= start) previous = span;
  }
  const redirectionTarget =
    previous !== null &&
    previous.op &&
    REDIRECTIONS.indexOf(previous.text) >= 0;

  let commandWord: string | null = null;
  let commandPosition = false;
  let index = 0;
  while (index < wordsBefore.length && isAssignment(wordsBefore[index].text)) index++;
  if (index >= wordsBefore.length) {
    commandPosition = true;
  } else {
    commandWord = wordsBefore[index].text;
  }

  let suggestions: Suggestion[] = [];

  if (redirectionTarget) {
    suggestions = pathSuggestions(shell, token, false);
  } else if (token.startsWith("$")) {
    suggestions = variableSuggestions(shell, token);
  } else if (commandPosition) {
    if (token.indexOf("/") >= 0 || token.startsWith(".") || token.startsWith("~")) {
      suggestions = pathSuggestions(shell, token, false);
    } else if (token !== "") {
      suggestions = commandSuggestions(shell, token);
    }
  } else if (commandWord) {
    if (token.startsWith("-")) {
      suggestions = optionSuggestions(commandWord, token);
    }
    if (suggestions.length === 0) {
      const dirsOnly = commandWord === "cd" || commandWord === "rmdir";
      suggestions = pathSuggestions(shell, token, dirsOnly);
    }
  }

  // Never offer a "suggestion" identical to what is already typed.
  suggestions = suggestions.filter((suggestion) => suggestion.value !== token);

  let ghost = "";
  if (suggestions.length > 0 && token !== "") {
    const best = suggestions[0];
    if (best.kind !== "history" && best.value.startsWith(token)) {
      ghost = best.value.slice(token.length);
      if (ghost.indexOf(" ") >= 0) ghost = "";
    }
  }

  return { suggestions, start, end, ghost };
}

/** Apply a suggestion, returning the new line and caret position. */
export function applySuggestion(
  line: string,
  completion: CompletionResult,
  suggestion: Suggestion,
): { line: string; caret: number } {
  const before = line.slice(0, completion.start);
  const after = line.slice(completion.end);
  const inserted = suggestion.value + (suggestion.appendSpace ? " " : "");
  return { line: before + inserted + after, caret: before.length + inserted.length };
}
