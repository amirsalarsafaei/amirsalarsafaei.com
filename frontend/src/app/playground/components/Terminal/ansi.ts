// Minimal ANSI SGR parser. Commands emit escape sequences; the renderer turns
// them into styled spans. Kept framework-free so the shell can be tested (or
// reused) without React.

export interface AnsiStyle {
  color?: string;
  backgroundColor?: string;
  fontWeight?: number;
  fontStyle?: "italic";
  textDecoration?: "underline";
  opacity?: number;
}

export interface AnsiSegment {
  text: string;
  style: AnsiStyle;
}

const BASE_COLORS = [
  "#3b4048",
  "#e06c75",
  "#98c379",
  "#e5c07b",
  "#61afef",
  "#c678dd",
  "#56b6c2",
  "#abb2bf",
  "#5c6370",
  "#ff7b86",
  "#b8e39a",
  "#ffd68a",
  "#82b8ff",
  "#dda0ff",
  "#7fe3ef",
  "#ffffff",
];

const CUBE_LEVELS = [0, 95, 135, 175, 215, 255];

function xterm256(index: number): string {
  if (index < 0 || index > 255) return BASE_COLORS[7];
  if (index < 16) return BASE_COLORS[index];
  if (index < 232) {
    const i = index - 16;
    const r = CUBE_LEVELS[Math.floor(i / 36) % 6];
    const g = CUBE_LEVELS[Math.floor(i / 6) % 6];
    const b = CUBE_LEVELS[i % 6];
    return `rgb(${r}, ${g}, ${b})`;
  }
  const level = 8 + (index - 232) * 10;
  return `rgb(${level}, ${level}, ${level})`;
}

// eslint-disable-next-line no-control-regex
const SGR = /\x1b\[([0-9;]*)m/g;

export function parseAnsi(input: string): AnsiSegment[] {
  if (input.indexOf("\x1b") === -1) {
    return [{ text: input, style: {} }];
  }

  const segments: AnsiSegment[] = [];
  let style: AnsiStyle = {};
  let last = 0;
  SGR.lastIndex = 0;

  const push = (text: string) => {
    if (text === "") return;
    segments.push({ text, style: { ...style } });
  };

  let match: RegExpExecArray | null;
  while ((match = SGR.exec(input)) !== null) {
    push(input.slice(last, match.index));
    last = match.index + match[0].length;

    const params = match[1] === "" ? [0] : match[1].split(";").map(Number);
    for (let i = 0; i < params.length; i++) {
      const code = params[i];
      if (code === 0) {
        style = {};
      } else if (code === 1) {
        style = { ...style, fontWeight: 700 };
      } else if (code === 2) {
        style = { ...style, opacity: 0.7 };
      } else if (code === 3) {
        style = { ...style, fontStyle: "italic" };
      } else if (code === 4) {
        style = { ...style, textDecoration: "underline" };
      } else if (code === 22) {
        style = { ...style, fontWeight: 400, opacity: 1 };
      } else if (code === 23) {
        style = { ...style, fontStyle: undefined };
      } else if (code === 24) {
        style = { ...style, textDecoration: undefined };
      } else if (code >= 30 && code <= 37) {
        style = { ...style, color: BASE_COLORS[code - 30] };
      } else if (code >= 90 && code <= 97) {
        style = { ...style, color: BASE_COLORS[code - 90 + 8] };
      } else if (code === 39) {
        style = { ...style, color: undefined };
      } else if (code >= 40 && code <= 47) {
        style = { ...style, backgroundColor: BASE_COLORS[code - 40] };
      } else if (code >= 100 && code <= 107) {
        style = { ...style, backgroundColor: BASE_COLORS[code - 100 + 8] };
      } else if (code === 49) {
        style = { ...style, backgroundColor: undefined };
      } else if ((code === 38 || code === 48) && params[i + 1] === 5) {
        const color = xterm256(params[i + 2] ?? 7);
        style =
          code === 38
            ? { ...style, color }
            : { ...style, backgroundColor: color };
        i += 2;
      } else if ((code === 38 || code === 48) && params[i + 1] === 2) {
        const r = params[i + 2] ?? 0;
        const g = params[i + 3] ?? 0;
        const b = params[i + 4] ?? 0;
        const color = `rgb(${r}, ${g}, ${b})`;
        style =
          code === 38
            ? { ...style, color }
            : { ...style, backgroundColor: color };
        i += 4;
      }
    }
  }
  push(input.slice(last));
  return segments;
}

export function stripAnsi(input: string): string {
  return input.replace(SGR, "");
}
