import type { WizardConfig } from "../../models";
import { useStepProject } from "../../viewmodels/useStepProject";
import { useI18n } from "../../i18n";

interface Props {
  config: WizardConfig;
  onChange: (partial: Partial<WizardConfig>) => void;
  onNext: () => void;
  onBack: () => void;
}

const DATABASES = [
  { id: "none"     as const, icon: "—"  },
  { id: "postgres" as const, label: "PostgreSQL", icon: "🐘" },
  { id: "mysql"    as const, label: "MySQL",      icon: "🐬" },
  { id: "mongodb"  as const, label: "MongoDB",    icon: "🍃" },
] as const;

const DOCKER_TOOLS = [
  { id: "docker"   as const, label: "Docker Desktop", icon: "🐳" },
  { id: "orbstack" as const, label: "OrbStack",        icon: "⚡" },
] as const;

export default function StepProject({ config, onChange, onNext, onBack }: Readonly<Props>) {
  const { t } = useI18n();
  const p = t.project;
  const { os, canContinue, nameError, fullPath, pathExists, conflictResolution, resolveConflict } = useStepProject(config, onChange);

  return (
    <div className="max-w-xl mx-auto px-8 py-8">
      <div className="mb-7">
        <h2 className="text-xl font-bold mb-1.5">{p.title}</h2>
        <p className="text-muted">{p.subtitle}</p>
      </div>

      <div className="form-group">
        <label className="label" htmlFor="proj-name">{p.nameLabel}</label>
        <input
          id="proj-name"
          className="input"
          value={config.projectName}
          onChange={(e) => onChange({ projectName: e.target.value })}
          placeholder="meu-projeto"
        />
        {nameError && <p className="mt-1.5 text-xs text-danger">{nameError}</p>}
      </div>

      <div className="form-group">
        <label className="label" htmlFor="proj-path">{p.pathLabel}</label>
        <input
          id="proj-path"
          className="input"
          value={config.projectPath}
          onChange={(e) => onChange({ projectPath: e.target.value })}
          placeholder={p.pathPlaceholder}
        />
        {fullPath && <p className="mt-1.5 text-[11px] text-faint font-mono">{fullPath}</p>}
        {pathExists && conflictResolution !== "overwrite" && (
          <div className="mt-3 card border-warn bg-warn/5 px-4 py-3 flex items-start justify-between gap-4">
            <p className="text-warn text-[13px]">{p.conflictMsg}</p>
            <div className="flex gap-2 shrink-0">
              <button
                className="btn btn-ghost"
                style={{ padding: "3px 10px", fontSize: 12 }}
                onClick={() => resolveConflict("rename")}
              >
                {p.rename}
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "3px 10px", fontSize: 12 }}
                onClick={() => resolveConflict("overwrite")}
              >
                {p.overwrite}
              </button>
            </div>
          </div>
        )}
        {pathExists && conflictResolution === "overwrite" && (
          <div className="mt-3 card border-warn bg-warn/5 px-4 py-3 flex items-center justify-between gap-4">
            <p className="text-warn text-[13px]">{p.overwriteConfirm}</p>
            <button
              className="btn btn-ghost"
              style={{ padding: "3px 10px", fontSize: 12 }}
              onClick={() => resolveConflict(null)}
            >
              {t.cancel}
            </button>
          </div>
        )}
      </div>

      {config.framework !== "angular" && config.framework !== "nuxt" && config.framework !== "vite" && (
        <>
          <div className="h-px bg-border my-5" />
          <div className="mb-5">
            <span className="label">{p.dbLabel}</span>
            <div className="grid grid-cols-4 gap-2">
              {DATABASES.map((db) => (
                <button
                  key={db.id}
                  type="button"
                  className={`card-pick text-center py-3 px-2 ${config.database === db.id ? "selected" : ""}`}
                  onClick={() => onChange({ database: db.id })}
                >
                  <div className="text-lg mb-1">{db.icon}</div>
                  <div className="text-xs font-medium">
                    {db.id === "none" ? p.dbNone : db.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="h-px bg-border my-5" />

      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold">{p.dockerTitle}</span>
          <p className="text-xs text-faint mt-0.5">{p.dockerDesc}</p>
        </div>
        <button
          type="button"
          aria-label={`Docker ${config.docker ? p.dockerOn : p.dockerOff}`}
          className={`toggle ${config.docker ? "on" : ""}`}
          onClick={() => onChange({ docker: !config.docker })}
        >
          <div className="toggle-track" />
        </button>
      </div>

      {config.docker && os === "macos" && (
        <div className="mt-4 pl-4 border-l-2 border-border">
          <p className="text-xs text-muted mb-2">{p.containerTool}</p>
          <div className="grid grid-cols-2 gap-2">
            {DOCKER_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                aria-label={tool.label}
                className={`card-pick text-left py-3 px-4 ${config.docker_tool === tool.id ? "selected" : ""}`}
                onClick={() => onChange({ docker_tool: tool.id })}
              >
                <div className="text-lg mb-1">{tool.icon}</div>
                <div className="font-semibold text-[13px]">{tool.label}</div>
                <p className="text-xs text-muted mt-0.5">
                  {tool.id === "orbstack" ? p.orbstackDesc : p.dockerDesktopDesc}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <button className="btn btn-ghost" onClick={onBack}>{t.back}</button>
        <button className="btn btn-primary" onClick={onNext} disabled={!canContinue}>
          {p.createBtn}
        </button>
      </div>
    </div>
  );
}
