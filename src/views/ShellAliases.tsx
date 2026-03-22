import { useState } from "react";
import { useI18n } from "../i18n";
import { useShellAliases, PRESET_ALIASES } from "../viewmodels/useShellAliases";
import type { ShellAlias } from "../models";
import TerminalOutput from "../components/TerminalOutput";

interface Props {
  onBack: () => void;
}

function CategorySection({ title, aliases, presets, hasPreset, onAddPreset, onRemove, addLabel, removeLabel }: Readonly<{
  title: string;
  aliases: ShellAlias[];
  presets: ShellAlias[];
  hasPreset: (id: string) => boolean;
  onAddPreset: (p: ShellAlias) => void;
  onRemove: (id: string) => void;
  addLabel: string;
  removeLabel: string;
}>) {
  const suggested = presets.filter((p) => !hasPreset(p.id));

  return (
    <div className="mb-6">
      <p className="label mb-2">{title}</p>
      {aliases.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {aliases.map((a) => (
            <div key={a.id} className="card flex items-center gap-3 py-2.5 px-4">
              <code className="font-mono text-brand text-[12px] w-16 shrink-0">{a.name}</code>
              <span className="font-mono text-[11px] text-muted flex-1 truncate">{a.command}</span>
              {a.description && (
                <span className="text-[11px] text-faint hidden sm:block">{a.description}</span>
              )}
              <button className="btn btn-ghost text-xs" style={{ padding: "2px 8px", fontSize: 11 }}
                onClick={() => onRemove(a.id)}>{removeLabel}</button>
            </div>
          ))}
        </div>
      )}
      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggested.map((p) => (
            <button key={p.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-[11px] text-muted hover:border-brand hover:text-ink transition-colors"
              onClick={() => onAddPreset(p)}>
              <span className="font-mono text-brand">{p.name}</span>
              <span className="text-faint">→</span>
              <span className="truncate max-w-36">{p.command}</span>
              <span className="text-ok text-xs">+</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShellAliases({ onBack }: Readonly<Props>) {
  const { t } = useI18n();
  const a = t.aliases;
  const {
    aliases, saving, saveResult,
    addPreset, addCustom, remove, hasPreset, saveToShell,
    byCategory, presetsByCategory,
  } = useShellAliases();

  const [customName, setCustomName] = useState("");
  const [customCommand, setCustomCommand] = useState("");

  const saveLog = saveResult
    ? [{ id: 1, text: saveResult, type: saveResult.startsWith("✗") ? "err" as const : "ok" as const }]
    : [];

  function handleAddCustom() {
    addCustom(customName, customCommand);
    setCustomName("");
    setCustomCommand("");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button className="btn btn-ghost py-1 px-2" onClick={onBack}>{t.back}</button>
        <span className="font-semibold text-[15px]">{a.title}</span>
        <button className="btn btn-primary ml-auto" disabled={saving || aliases.length === 0}
          onClick={saveToShell}>
          {saving ? a.saving : a.saveToShell}
        </button>
      </header>

      <main className="flex-1 px-8 py-8 max-w-2xl mx-auto w-full">
        <p className="text-muted text-sm mb-6">{a.subtitle}</p>

        <CategorySection
          title={a.sectionDocker}
          aliases={byCategory("docker")}
          presets={presetsByCategory("docker")}
          hasPreset={hasPreset}
          onAddPreset={addPreset}
          onRemove={remove}
          addLabel={a.presetAdd}
          removeLabel={a.removeBtn}
        />

        <CategorySection
          title={a.sectionGit}
          aliases={byCategory("git")}
          presets={presetsByCategory("git")}
          hasPreset={hasPreset}
          onAddPreset={addPreset}
          onRemove={remove}
          addLabel={a.presetAdd}
          removeLabel={a.removeBtn}
        />

        <CategorySection
          title={a.sectionNode}
          aliases={byCategory("node")}
          presets={presetsByCategory("node")}
          hasPreset={hasPreset}
          onAddPreset={addPreset}
          onRemove={remove}
          addLabel={a.presetAdd}
          removeLabel={a.removeBtn}
        />

        {/* Custom aliases */}
        <div className="mb-6">
          <p className="label mb-2">{a.sectionCustom}</p>
          {byCategory("custom").length === 0 ? (
            <p className="text-faint text-xs mb-3">{a.noCustom}</p>
          ) : (
            <div className="flex flex-col gap-1.5 mb-3">
              {byCategory("custom").map((al) => (
                <div key={al.id} className="card flex items-center gap-3 py-2.5 px-4">
                  <code className="font-mono text-brand text-[12px] w-16 shrink-0">{al.name}</code>
                  <span className="font-mono text-[11px] text-muted flex-1 truncate">{al.command}</span>
                  <button className="btn btn-ghost text-xs" style={{ padding: "2px 8px", fontSize: 11 }}
                    onClick={() => remove(al.id)}>{a.removeBtn}</button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-none w-28">
              <label className="label" htmlFor="alias-name">{a.nameLabel}</label>
              <input id="alias-name" className="input" value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={a.namePlaceholder} />
            </div>
            <div className="flex-1">
              <label className="label" htmlFor="alias-cmd">{a.commandLabel}</label>
              <input id="alias-cmd" className="input" value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder={a.commandPlaceholder}
                onKeyDown={(e) => e.key === "Enter" && handleAddCustom()} />
            </div>
            <button className="btn btn-secondary shrink-0"
              disabled={!customName.trim() || !customCommand.trim()}
              onClick={handleAddCustom}>
              + {a.addCustom}
            </button>
          </div>
        </div>

        <TerminalOutput logs={saveLog} />
      </main>
    </div>
  );
}
