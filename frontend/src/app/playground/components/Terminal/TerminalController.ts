import { Shell } from "./shell";
import { CompletionResult, complete } from "./completion";
import { C } from "./commands";

export interface CommandRecord {
  id: string;
  command: string;
  stdout?: string;
  stderr?: string;
  /** Prompt path at the time the command ran. */
  path: string;
  sentAt: Date;
  code?: number;
  /** System banner rows have no prompt and no timestamp. */
  system?: boolean;
}

const WELCOME_ART = [
  "  █████╗ ███╗   ███╗██╗██████╗ ",
  " ██╔══██╗████╗ ████║██║██╔══██╗",
  " ███████║██╔████╔██║██║██████╔╝",
  " ██╔══██║██║╚██╔╝██║██║██╔══██╗",
  " ██║  ██║██║ ╚═╝ ██║██║██║  ██║",
  " ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═╝",
];

function welcome(): string {
  const dim = C.gray;
  const cyan = C.cyan;
  const bold = C.bold;
  const green = C.green;
  const yellow = C.yellow;
  const reset = C.reset;

  const art = WELCOME_ART.map((line, index) => {
    const color = [cyan, cyan, green, green, yellow, yellow][index] ?? cyan;
    return color + line + reset;
  }).join("\n");

  return (
    `${art}\n` +
    `${dim}  amirsalar's laptop · a POSIX-ish shell in a 3D room${reset}\n\n` +
    `  ${bold}${green}help${reset}          list every command\n` +
    `  ${bold}${green}ls -la${reset}        look around (~ is on a real little filesystem)\n` +
    `  ${bold}${green}cat README.md${reset} how this works\n` +
    `  ${bold}${green}neofetch${reset}      system vanity\n\n` +
    `  ${dim}Tab completes · ↑/↓ history · Ctrl+R search · Ctrl+L clear${reset}\n` +
    `  ${dim}The real site is a full TUI over SSH:${reset} ${bold}ssh ssh.amirsalarsafaei.com${reset}\n`
  );
}

export class TerminalController {
  shell: Shell;
  history: CommandRecord[] = [];
  private counter = 0;

  constructor() {
    this.shell = new Shell();
    this.addSystem(welcome());
  }

  private nextId(): string {
    this.counter++;
    return `cmd-${this.counter}`;
  }

  private addSystem(stdout: string): void {
    this.history.push({
      id: this.nextId(),
      command: "",
      path: "",
      sentAt: new Date(),
      stdout,
      system: true,
    });
  }

  getCurrentPath(): string {
    return this.shell.getPromptPath();
  }

  getPrompt(): { user: string; host: string; path: string } {
    return {
      user: this.shell.env.USER ?? "amirsalar",
      host: this.shell.env.HOSTNAME ?? "laptop",
      path: this.shell.getPromptPath(),
    };
  }

  runCommand(command: string): void {
    const trimmed = command.trim();
    if (trimmed === "") return;
    const promptPath = this.shell.getPromptPath();
    const result = this.shell.execute(command);

    if (result.clear) {
      this.history = [];
      return;
    }

    this.history = [
      ...this.history,
      {
        id: this.nextId(),
        command,
        path: promptPath,
        sentAt: new Date(),
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code,
      },
    ];
  }

  /** Record a Ctrl+C on the current line, the way an interactive shell does. */
  interrupt(command: string): void {
    this.history = [
      ...this.history,
      {
        id: this.nextId(),
        command,
        path: this.getCurrentPath(),
        sentAt: new Date(),
        stdout: `${C.gray}^C${C.reset}`,
        code: 130,
      },
    ];
  }

  getCommands(): CommandRecord[] {
    return this.history;
  }

  getSuggestions(line: string, caret: number): CompletionResult {
    return complete(this.shell, line, caret);
  }

  getHistory(): string[] {
    return this.shell.history;
  }

  getExitCode(): number {
    return this.shell.lastCode;
  }

  isExited(): boolean {
    return this.shell.exited;
  }

  clear(): void {
    this.history = [];
  }

  reset(): void {
    this.shell = new Shell();
    this.history = [];
    this.counter = 0;
    this.addSystem(welcome());
  }
}
