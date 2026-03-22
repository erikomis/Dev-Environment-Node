interface Props {
  label: string;
  percent: number;
  color?: string;
}

export default function ProgressDisplay({ label, percent, color = "var(--color-brand)" }: Readonly<Props>) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted mb-1.5">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  );
}
