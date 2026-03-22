import { useState } from "react";
import type { WizardConfig } from "../../models";
import { useStepInstall } from "../../viewmodels/useStepInstall";
import type { InstallStatus } from "../../viewmodels/useStepInstall";
import { useI18n } from "../../i18n";
import TerminalOutput from "../../components/TerminalOutput";
import ProgressDisplay from "../../components/ProgressDisplay";
import StepPostInstall from "./StepPostInstall";

interface Props {
  config: WizardConfig;
  onBack: () => void;
  onDone: () => void;
}

const BASE_KEYS: Array<keyof WizardConfig> = [
  "projectName", "framework", "typescript", "packageManager", "database", "docker",
];

function summaryKeys(config: WizardConfig): Array<keyof WizardConfig> {
  if (!config.docker) return BASE_KEYS;
  return [...BASE_KEYS, "docker_tool"];
}

function progressColor(status: InstallStatus): string {
  if (status === "error") return "var(--color-danger)";
  if (status === "done")  return "var(--color-ok)";
  return "var(--color-brand)";
}

export default function StepInstall({ config, onBack, onDone }: Readonly<Props>) {
  const { t } = useI18n();
  const ins = t.install;
  const { status, logs, progress, run } = useStepInstall();
  const [showExtras, setShowExtras] = useState(false);

  function formatValue(key: keyof WizardConfig): string {
    const v = config[key];
    if (typeof v === "boolean") return v ? t.yes : t.no;
    if (key === "database" && v === "none") return ins.dbNone;
    if (key === "docker_tool") return v === "orbstack" ? "OrbStack" : ins.dockerDesktop;
    return String(v);
  }

  if (showExtras) {
    return (
      <StepPostInstall
        projectPath={config.projectPath}
        projectName={config.projectName}
        framework={config.framework}
        database={config.database}
        onDone={onDone}
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto px-8 py-8">
      <div className="mb-7">
        <h2 className="text-xl font-bold mb-1.5">
          {status === "done" ? ins.titleDone : ins.titleDefault}
        </h2>
        <p className="text-muted">{ins.subtitles[status]}</p>
      </div>

      {status === "idle" && (
        <div className="card mb-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {summaryKeys(config).map((key) => (
              <div key={key}>
                <div className="text-xs text-faint mb-0.5">
                  {ins.summaryLabels[key as keyof typeof ins.summaryLabels] ?? key}
                </div>
                <div className="font-medium text-[13px]">{formatValue(key)}</div>
              </div>
            ))}
            <div className="col-span-2">
              <div className="text-xs text-faint mb-0.5">{ins.destination}</div>
              <div className="font-mono text-xs text-muted break-all">
                {config.projectPath}/{config.projectName}
              </div>
            </div>
          </div>
        </div>
      )}

      {status !== "idle" && (
        <div className="mb-5">
          <ProgressDisplay label={ins.progress} percent={progress} color={progressColor(status)} />
        </div>
      )}

      <TerminalOutput logs={logs} running={status === "running"} className="mb-6" />

      <div className="flex justify-between">
        <button className="btn btn-ghost" onClick={onBack} disabled={status === "running"}>
          {t.back}
        </button>
        <div className="flex gap-2">
          {status === "idle"  && <button className="btn btn-primary btn-lg" onClick={() => run(config)}>{ins.createBtn}</button>}
          {status === "error" && <button className="btn btn-secondary" onClick={() => run(config)}>{ins.retryBtn}</button>}
          {status === "done"  && (
            <>
              <button className="btn btn-ghost" onClick={onDone}>{ins.doneBtn}</button>
              <button className="btn btn-primary" onClick={() => setShowExtras(true)}>
                {t.postInstall.title} →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
