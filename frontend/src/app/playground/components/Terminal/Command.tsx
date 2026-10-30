import { memo, useMemo } from "react";
import { parseAnsi } from "./ansi";
import { formatTime } from "../../../../utils/time";

import "./command.scss";

export interface CommandProps {
  command: string;
  stdout?: string;
  stderr?: string;
  path: string;
  sentAt: Date;
  id: string;
  code?: number;
  system?: boolean;
}

function AnsiText({ text, className }: { text: string; className: string }) {
  const segments = useMemo(() => parseAnsi(text), [text]);
  return (
    <div className={className}>
      {segments.map((segment, index) => (
        <span key={index} style={segment.style}>
          {segment.text}
        </span>
      ))}
    </div>
  );
}

export const Command = memo(function Command({
  command,
  stdout,
  stderr,
  path,
  sentAt,
  code,
  system,
}: CommandProps) {
  if (system) {
    return <AnsiText className="system-output" text={stdout ?? ""} />;
  }

  const failed = code !== undefined && code !== 0;

  return (
    <div className="command-row">
      <div className="command">
        <div className="path">{path}</div>
        <div className="text">{command}</div>
        {failed && <div className="exit-code">{code}</div>}
        <div className="time">{formatTime(sentAt)}</div>
      </div>
      {stderr && stderr !== "" && (
        <AnsiText className="stderr cmdout" text={stderr} />
      )}
      {stdout && stdout !== "" && (
        <AnsiText className="stdout cmdout" text={stdout} />
      )}
    </div>
  );
});
