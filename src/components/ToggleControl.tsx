interface Props {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

export default function ToggleControl({ label, description, checked, onChange, ariaLabel, disabled = false }: Readonly<Props>) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="font-semibold">{label}</span>
        {description && <p className="text-xs text-faint mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        aria-label={ariaLabel ?? label}
        className={`toggle ${checked ? "on" : ""}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <div className="toggle-track" />
      </button>
    </div>
  );
}
