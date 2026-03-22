import { useState } from "react";
import { useWizard } from "../viewmodels/useWizard";
import { useI18n } from "../i18n";
import StepDetect  from "./steps/StepDetect";
import StepStack   from "./steps/StepStack";
import StepProject from "./steps/StepProject";
import StepInstall from "./steps/StepInstall";

interface Props {
  onBack: () => void;
  envReady?: boolean;
}

export default function Wizard({ onBack, envReady = false }: Readonly<Props>) {
  const { t } = useI18n();
  const tm = t.templates;
  const {
    step, config, update, next, prev, showResume, resume, restart, finish,
    templates, showTemplates, setShowTemplates,
    saveAsTemplate, loadFromTemplate, removeTemplate,
  } = useWizard(onBack, envReady);

  const [newTemplateName, setNewTemplateName] = useState("");

  function handleSaveTemplate() {
    if (!newTemplateName.trim()) return;
    saveAsTemplate(newTemplateName.trim());
    setNewTemplateName("");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button className="btn btn-ghost py-1 px-2" onClick={onBack}>{t.back}</button>
        <span className="font-semibold text-[15px]">{t.wizard.title}</span>
        <button className="btn btn-ghost py-1 px-2 ml-auto text-xs"
          onClick={() => setShowTemplates(!showTemplates)}>
          {tm.templates} {templates.length > 0 && `(${templates.length})`}
        </button>
      </header>

      {/* Template panel */}
      {showTemplates && (
        <div className="mx-8 mt-4 card border-brand bg-brand/5 px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-[13px]">{tm.templates}</p>
          </div>

          {/* Save current as template */}
          <div className="flex gap-2 mb-4">
            <input className="input flex-1 text-xs" value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder={tm.templateNamePlaceholder}
              onKeyDown={(e) => e.key === "Enter" && handleSaveTemplate()} />
            <button className="btn btn-secondary shrink-0" style={{ padding: "3px 10px", fontSize: 12 }}
              disabled={!newTemplateName.trim()}
              onClick={handleSaveTemplate}>
              {tm.saveTemplate}
            </button>
          </div>

          {/* Template list */}
          {templates.length === 0 ? (
            <p className="text-faint text-xs">{tm.noTemplates}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="flex items-center gap-3 bg-elevated rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-[13px]">{tpl.name}</span>
                    <span className="text-faint text-[11px] ml-2">
                      {tpl.config.framework} · {tpl.config.packageManager}
                    </span>
                  </div>
                  <span className="text-faint text-[11px]">
                    {tm.savedAt} {new Date(tpl.createdAt).toLocaleDateString()}
                  </span>
                  <button className="btn btn-primary" style={{ padding: "2px 8px", fontSize: 11 }}
                    onClick={() => loadFromTemplate(tpl.id)}>
                    {tm.loadBtn}
                  </button>
                  <button className="btn btn-ghost text-danger" style={{ padding: "2px 8px", fontSize: 11 }}
                    onClick={() => removeTemplate(tpl.id)}>
                    {tm.deleteBtn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showResume && (
        <div className="mx-8 mt-4 card border-brand bg-brand/5 flex items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="font-semibold text-[13px] mb-0.5">{t.wizard.resumeTitle}</p>
            <p className="text-xs text-muted">{t.wizard.resumeMsg}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button className="btn btn-ghost" style={{ padding: "3px 10px", fontSize: 12 }} onClick={restart}>
              {t.wizard.resumeNo}
            </button>
            <button className="btn btn-primary" style={{ padding: "3px 10px", fontSize: 12 }} onClick={resume}>
              {t.wizard.resumeYes}
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center px-8 py-5 border-b border-border">
        {t.wizard.steps.map((label, i) => {
          const isLast = i === t.wizard.steps.length - 1;
          let stepClass = "";
          if (i === step) stepClass = "active";
          else if (i < step) stepClass = "done";
          return (
            <div key={label} className="flex items-center" style={{ flex: isLast ? 0 : 1 }}>
              <div className={`step-node ${stepClass}`}>
                <div className="step-circle">{i < step ? "✓" : i + 1}</div>
                <span className="step-label">{label}</span>
              </div>
              {!isLast && <div className={`step-line ${i < step ? "done" : ""}`} />}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {step === 0 && <StepDetect onNext={next} />}
        {step === 1 && <StepStack   config={config} onChange={update} onNext={next} onBack={prev} />}
        {step === 2 && <StepProject config={config} onChange={update} onNext={next} onBack={prev} />}
        {step === 3 && <StepInstall config={config} onBack={prev} onDone={finish} />}
      </div>
    </div>
  );
}
