import type { LogEntry } from "../models";

interface Props {
  logs: LogEntry[];
  running?: boolean;
  className?: string;
}

const LOG_CLASS: Record<LogEntry["type"], string> = {
  ok:   "t-line hi",
  err:  "t-line error",
  info: "t-line",
};

export default function TerminalOutput({ logs, running = false, className = "" }: Readonly<Props>) {
  if (logs.length === 0 && !running) return null;
  return (
    <div className={`terminal ${className}`}>
      {logs.map((entry) => (
        <div key={entry.id} className={LOG_CLASS[entry.type]}>{entry.text}</div>
      ))}
      {running && <span className="t-cursor" />}
    </div>
  );
}
