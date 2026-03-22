import { useI18n } from "../../i18n";
import { usePostInstall } from "../../viewmodels/usePostInstall";
import type { Framework } from "../../models";

interface Props {
  projectPath: string;
  projectName: string;
  framework: Framework;
  database: string;
  onDone: () => void;
}

export default function StepPostInstall({ projectPath, projectName, framework, database, onDone }: Readonly<Props>) {
  const { t } = useI18n();
  const pi = t.postInstall;
  const {
    extensions, selectedExtensions, toggleExtension,
    installingExtensions, extensionsDone, installExtensions,
    envContent, setEnvContent, savingEnv, envDone, saveEnv,
  } = usePostInstall(projectPath, projectName, framework, database);

  return (
    <div className="max-w-xl mx-auto px-8 py-8">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1.5">{pi.title}</h2>
        <p className="text-muted">{pi.subtitle}</p>
      </div>

      {/* VS Code extensions */}
      <div className="card mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-[13px] mb-0.5">{pi.vscodeSectionTitle}</p>
            <p className="text-xs text-muted">{pi.vscodeSectionDesc}</p>
          </div>
          <button className="btn btn-secondary shrink-0" style={{ padding: "3px 10px", fontSize: 12 }}
            disabled={installingExtensions || extensionsDone || selectedExtensions.length === 0}
            onClick={installExtensions}>
            {extensionsDone ? "✅" : installingExtensions ? pi.installingExtensions : pi.installExtensions}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {extensions.map((ext) => {
            const selected = selectedExtensions.includes(ext);
            return (
              <button key={ext}
                className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors ${selected ? "border-brand bg-brand/10 text-brand" : "border-border text-muted"}`}
                onClick={() => toggleExtension(ext)}>
                {ext.split(".")[1] ?? ext}
              </button>
            );
          })}
        </div>
        {extensionsDone && (
          <p className="text-ok text-xs mt-2">{pi.extensionsInstalled}</p>
        )}
      </div>

      {/* .env editor */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-[13px] mb-0.5">{pi.envSectionTitle}</p>
            <p className="text-xs text-muted">{pi.envSectionDesc}</p>
          </div>
          <button className="btn btn-secondary shrink-0" style={{ padding: "3px 10px", fontSize: 12 }}
            disabled={savingEnv || envDone}
            onClick={saveEnv}>
            {envDone ? "✅" : savingEnv ? pi.savingEnv : pi.saveEnv}
          </button>
        </div>
        <textarea
          className="input font-mono text-[12px] leading-relaxed resize-none"
          style={{ minHeight: 120 }}
          value={envContent}
          onChange={(e) => setEnvContent(e.target.value)}
          spellCheck={false}
        />
        {envDone && (
          <p className="text-ok text-xs mt-2">{pi.envSaved}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onDone}>{pi.skip}</button>
        <button className="btn btn-primary" onClick={onDone}>{pi.done}</button>
      </div>
    </div>
  );
}
