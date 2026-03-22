import { useI18n } from "../i18n";
import { useDockerCompose } from "../viewmodels/useDockerCompose";
import { invoke } from "@tauri-apps/api/core";
import type { DockerServiceName } from "../models";

interface Props {
  onBack: () => void;
}

const SERVICE_ICONS: Record<DockerServiceName, string> = {
  postgres:      "🐘",
  mysql:         "🐬",
  mongodb:       "🍃",
  redis:         "⚡",
  rabbitmq:      "🐰",
  nginx:         "🌐",
  elasticsearch: "🔍",
};

export default function DockerCompose({ onBack }: Readonly<Props>) {
  const { t } = useI18n();
  const dc = t.dockerCompose;
  const {
    services, outputPath, setOutputPath,
    generating, generated, error,
    toggleService, updatePort, updateVersion,
    generate, enabledCount,
  } = useDockerCompose();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button className="btn btn-ghost py-1 px-2" onClick={onBack}>{t.back}</button>
        <span className="font-semibold text-[15px]">{dc.title}</span>
      </header>

      <main className="flex-1 px-8 py-8 max-w-2xl mx-auto w-full">
        <p className="text-muted text-sm mb-6">{dc.subtitle}</p>

        <p className="label mb-3">{dc.servicesLabel}</p>
        <div className="flex flex-col gap-2 mb-6">
          {services.map((svc) => (
            <div key={svc.id}
              className={`card flex items-center gap-4 py-3 px-4 cursor-pointer transition-all ${svc.enabled ? "border-brand bg-brand/5" : ""}`}
              onClick={() => toggleService(svc.id)}>
              <span className="text-xl">{SERVICE_ICONS[svc.id]}</span>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-[13px] capitalize">{svc.id}</span>
                <p className="text-xs text-muted truncate">
                  {dc.serviceDescriptions[svc.id as keyof typeof dc.serviceDescriptions]}
                </p>
              </div>
              {svc.enabled && (
                <div className="flex gap-2 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <div className="text-[10px] text-faint mb-0.5">{dc.portLabel}</div>
                    <input className="input text-xs" style={{ width: 72, padding: "2px 6px" }}
                      value={svc.port}
                      onChange={(e) => updatePort(svc.id, e.target.value)} />
                  </div>
                  <div>
                    <div className="text-[10px] text-faint mb-0.5">{dc.versionLabel}</div>
                    <input className="input text-xs" style={{ width: 88, padding: "2px 6px" }}
                      value={svc.version}
                      onChange={(e) => updateVersion(svc.id, e.target.value)} />
                  </div>
                </div>
              )}
              <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${svc.enabled ? "bg-brand border-brand text-black" : "border-border"}`}>
                {svc.enabled && <span className="text-[10px]">✓</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <label className="label" htmlFor="dc-path">{dc.pathLabel}</label>
          <input id="dc-path" className="input" value={outputPath}
            onChange={(e) => setOutputPath(e.target.value)}
            placeholder={dc.pathPlaceholder} />
        </div>

        {error && (
          <div className="card border-danger bg-danger/5 px-4 py-3 mb-4">
            <p className="text-danger text-[13px]">{error}</p>
          </div>
        )}

        {generated && (
          <div className="card border-ok bg-ok/5 px-4 py-3 mb-4 flex items-center justify-between">
            <p className="text-ok text-[13px]">{dc.generated}</p>
            <button className="btn btn-ghost text-xs" style={{ padding: "2px 8px", fontSize: 11 }}
              onClick={() => invoke("open_folder", { path: outputPath }).catch(() => {})}>
              {dc.openFolder}
            </button>
          </div>
        )}

        <button className="btn btn-primary btn-lg w-full"
          disabled={generating || enabledCount === 0 || !outputPath.trim()}
          onClick={generate}>
          {generating ? dc.generating : dc.generate}
          {enabledCount > 0 && !generating && ` (${enabledCount})`}
        </button>
      </main>
    </div>
  );
}
