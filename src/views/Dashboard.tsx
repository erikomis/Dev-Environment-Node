import { useI18n } from "../i18n";
import { useDashboard } from "../viewmodels/useDashboard";
import { useScriptRunner } from "../viewmodels/useScriptRunner";
import type { CreatedProject } from "../models";
import TerminalOutput from "../components/TerminalOutput";

interface Props {
  onBack: () => void;
}

function ScriptList({ scripts, loading, running, onRun, loadingLabel, emptyLabel }: Readonly<{
  scripts: Record<string, string>;
  loading: boolean;
  running: string | null;
  onRun: (name: string) => void;
  loadingLabel: string;
  emptyLabel: string;
}>) {
  if (loading) return <p className="text-faint text-xs">{loadingLabel}</p>;
  if (Object.keys(scripts).length === 0) return <p className="text-faint text-xs">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {Object.entries(scripts).map(([name, cmd]) => (
        <button key={name}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] hover:border-brand transition-colors"
          disabled={!!running}
          title={cmd}
          onClick={() => onRun(name)}>
          <span className="font-mono text-brand">{name}</span>
          {running === name && <span className="text-faint">…</span>}
        </button>
      ))}
    </div>
  );
}

function ScriptPanel({ project }: Readonly<{ project: CreatedProject }>) {
  const { t } = useI18n();
  const s = t.scripts;
  const fullPath = `${project.path}/${project.name}`;
  const { scripts, loadingScripts, running, logs, expanded, toggleExpand, runScript } =
    useScriptRunner(fullPath, project.packageManager);

  return (
    <div className="border-t border-border mt-3 pt-3">
      <button className="btn btn-ghost text-xs flex items-center gap-1.5"
        style={{ padding: "2px 8px", fontSize: 11 }} onClick={toggleExpand}>
        <span>{s.scriptsBtn}</span>
        <span className="text-faint">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="mt-3">
          <ScriptList
            scripts={scripts}
            loading={loadingScripts}
            running={running}
            onRun={runScript}
            loadingLabel={s.loadingScripts}
            emptyLabel={s.noScripts}
          />
          <TerminalOutput logs={logs} running={!!running} className="max-h-40" />
        </div>
      )}
    </div>
  );
}

function ProjectRow({ project, onOpen, openLabel }: Readonly<{
  project: CreatedProject;
  onOpen: (path: string) => void;
  openLabel: string;
}>) {
  const { t } = useI18n();
  const d = t.dashboard;
  return (
    <div className="card py-4 px-5">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-[14px]">{project.name}</span>
            <span className="badge badge-info text-[11px]">{project.framework}</span>
            {project.typescript && (
              <span className="text-[10px] font-mono text-brand bg-brand/10 px-1.5 py-0.5 rounded">TS</span>
            )}
            {project.docker && <span className="text-[10px] text-faint">🐳</span>}
          </div>
          <p className="font-mono text-xs text-faint truncate mb-2">
            {project.path}/{project.name}
          </p>
          <div className="flex gap-4 text-[11px] text-muted">
            <span>{d.framework}: {project.framework}</span>
            {project.database !== "none" && <span>DB: {project.database}</span>}
            <span>{project.packageManager}</span>
            <span className="text-faint ml-auto">
              {d.createdAt}: {new Date(project.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <button
          className="btn btn-secondary shrink-0"
          style={{ padding: "3px 10px", fontSize: 12 }}
          onClick={() => onOpen(`${project.path}/${project.name}`)}>
          {openLabel}
        </button>
      </div>
      <ScriptPanel project={project} />
    </div>
  );
}

export default function Dashboard({ onBack }: Readonly<Props>) {
  const { t } = useI18n();
  const d = t.dashboard;
  const { projects, confirmClear, requestClear, cancelClear, openFolder } = useDashboard();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button className="btn btn-ghost py-1 px-2" onClick={onBack}>{t.back}</button>
        <span className="font-semibold text-[15px]">{d.title}</span>
        {projects.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {confirmClear && (
              <button className="btn btn-ghost text-xs" style={{ padding: "3px 10px" }} onClick={cancelClear}>
                {t.cancel}
              </button>
            )}
            <button
              className={`btn text-xs ${confirmClear ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "3px 10px" }}
              onClick={requestClear}>
              {confirmClear ? t.ok : d.clearAll}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 px-8 py-8 max-w-2xl mx-auto w-full">
        <p className="text-muted text-sm mb-6">{d.subtitle}</p>

        {projects.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-muted mb-2">{d.empty}</p>
            <p className="text-faint text-xs">{d.emptyHint}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {[...projects].reverse().map((p) => (
              <ProjectRow key={p.id} project={p} onOpen={openFolder} openLabel={d.openFolder} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
