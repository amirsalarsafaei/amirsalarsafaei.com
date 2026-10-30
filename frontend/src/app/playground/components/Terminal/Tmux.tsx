import { useEffect, useState } from "react";
import { Terminal } from "./Terminal";

import "./tmux.scss";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

// The clock lives in its own component so ticking once a second does not
// re-render the terminal (and its scrollback) sixty times a minute.
function Clock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <span className="tmux-status-item">
      {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
    </span>
  );
}

export default function Tmux({ focused }: { focused: boolean }) {
  return (
    <div className="tmux">
      <div className="tmux-bar tmux-bar--top" aria-hidden>
        <span className="tmux-session">amirsalar@laptop</span>
        <span className="tmux-tab tmux-tab--active">0:bash*</span>
        <span className="tmux-tab">1:notes-</span>
        <span className="tmux-tab">2:logs-</span>
        <span className="tmux-spacer" />
        <span className="tmux-badge">POSIX</span>
      </div>

      <div className="pane">
        <Terminal focused={focused} />
      </div>

      <div className="tmux-bar tmux-bar--bottom" aria-hidden>
        <span className="tmux-status-session">[amirsalar]</span>
        <span className="tmux-tab tmux-tab--active">0:bash*</span>
        <span className="tmux-spacer" />
        <span className="tmux-status-item">tty1</span>
        <Clock />
      </div>
    </div>
  );
}
