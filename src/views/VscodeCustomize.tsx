import {
  useVscode,
  ESSENTIALS, PRODUCTIVITY,
  FRONTEND_OPTIONS, BACKEND_OPTIONS, STACK_OPTIONS, FONTS,
  type EssentialId, type ProductivityId,
  type FrontendId, type BackendId, type StackId,
} from "../viewmodels/useVscode";

interface Props {
  onBack: () => void;
}

type ExtGroup<T extends { id: string; extensions: readonly string[] }> = {
  options: readonly T[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  isInstalled: (id: string) => boolean;
};

function FrameworkGrid<T extends { id: string; label: string; icon: string; desc: string; extensions: readonly string[] }>({
  options, selected, onToggle, isInstalled,
}: ExtGroup<T>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => {
        const on = selected.has(opt.id);
        const allInstalled = opt.extensions.every(isInstalled);
        return (
          <button
            key={opt.id}
            type="button"
            className={`card-pick text-left flex flex-col gap-1.5 py-3 px-4 ${on ? "selected" : ""} ${allInstalled ? "opacity-60" : ""}`}
            onClick={() => !allInstalled && onToggle(opt.id)}
            disabled={allInstalled}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{opt.icon}</span>
                <span className="font-semibold text-[13px]">{opt.label}</span>
              </div>
              {allInstalled
                ? <span className="badge badge-ok text-[10px]">Instalada</span>
                : on && <span className="text-brand text-sm">✓</span>
              }
            </div>
            <p className="text-xs text-muted leading-relaxed">{opt.desc}</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {opt.extensions.map((id) => (
                <span key={id} className="text-[10px] font-mono text-faint bg-surface px-1.5 py-0.5 rounded">
                  {id.split(".")[1]}
                </span>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function VscodeCustomize({ onBack }: Readonly<Props>) {
  const vm = useVscode();

  const logClass = { ok: "t-line hi", err: "t-line error", info: "t-line" };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button className="btn btn-ghost py-1 px-2" onClick={onBack}>← Voltar</button>
        <span className="font-semibold text-[15px]">Configurar VSCode</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-8 py-8">

          {/* Status */}
          <div className="card flex items-center gap-4 mb-8">
            <span className="text-3xl">⌨️</span>
            <div className="flex-1">
              <div className="font-semibold mb-0.5">Visual Studio Code</div>
              {vm.loading ? (
                <span className="text-faint text-xs">detectando…</span>
              ) : vm.status?.cli_available ? (
                <span className="font-mono text-sm text-muted">{vm.status.version ?? "instalado"}</span>
              ) : (
                <span className="text-xs text-warn">
                  CLI não encontrado — abra o VSCode e execute{" "}
                  <code>Shell Command: Install 'code' command in PATH</code>
                </span>
              )}
            </div>
            {!vm.loading && (
              <span className={`badge ${vm.status?.cli_available ? "badge-ok" : "badge-bad"}`}>
                {vm.status?.cli_available ? "Detectado" : "Não detectado"}
              </span>
            )}
          </div>

          {/* ── Fonte ──────────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-1">Fonte</h3>
            <p className="text-xs text-muted mb-3">
              Fontes com ligatures transformam{" "}
              <code className="font-mono text-brand">=&gt;</code>,{" "}
              <code className="font-mono text-brand">!==</code> e{" "}
              <code className="font-mono text-brand">-&gt;</code> em símbolos visuais
            </p>

            <div className="flex flex-col gap-2 mb-3">
              {FONTS.map((f) => {
                const alreadyInstalled =
                  (f.id === "fira-code"      && vm.status?.fira_code_installed) ||
                  (f.id === "jetbrains-mono" && vm.status?.jetbrains_mono_installed);
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`card-pick text-left flex items-center gap-4 py-3 px-4 ${vm.font === f.id ? "selected" : ""}`}
                    onClick={() => vm.setFont(f.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[13px]">{f.label}</span>
                        {alreadyInstalled && <span className="badge badge-ok">Instalada</span>}
                      </div>
                      <p className="text-xs text-muted">{f.desc}</p>
                    </div>
                    {vm.font === f.id && <span className="text-brand text-sm">✓</span>}
                  </button>
                );
              })}
            </div>

            {vm.font !== "none" && (
              <div className="card flex items-center justify-between py-3 px-4">
                <div>
                  <span className="font-semibold text-[13px]">Instalar fonte via Homebrew</span>
                  <p className="text-xs text-faint mt-0.5">Requer Homebrew instalado</p>
                </div>
                <button
                  type="button"
                  aria-label={`Instalar fonte ${vm.installFont ? "ativado" : "desativado"}`}
                  className={`toggle ${vm.installFont ? "on" : ""}`}
                  onClick={() => vm.setInstallFont((v) => !v)}
                >
                  <div className="toggle-track" />
                </button>
              </div>
            )}
          </section>

          {/* ── Essenciais ─────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-0.5">Essenciais</h3>
            <p className="text-xs text-muted mb-3">Úteis para qualquer projeto Node.js</p>
            <div className="flex flex-col gap-2">
              {ESSENTIALS.map((ext) => {
                const installed = vm.isInstalled(ext.id);
                const on = vm.essentials.has(ext.id as EssentialId);
                return (
                  <div key={ext.id} className="card flex items-center gap-4 py-3 px-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[13px]">{ext.label}</span>
                        <span className="text-[11px] text-faint font-mono">{ext.id}</span>
                      </div>
                      <p className="text-xs text-muted">{ext.desc}</p>
                    </div>
                    {installed ? (
                      <span className="badge badge-ok shrink-0">Instalada</span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`${ext.label} ${on ? "selecionado" : "não selecionado"}`}
                        className={`toggle shrink-0 ${on ? "on" : ""}`}
                        onClick={() => vm.setEssentials(vm.toggleSet(vm.essentials, ext.id as EssentialId))}
                      >
                        <div className="toggle-track" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Produtividade ──────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-0.5">Produtividade</h3>
            <p className="text-xs text-muted mb-3">Recomendadas para o dia a dia</p>
            <div className="flex flex-col gap-2">
              {PRODUCTIVITY.map((ext) => {
                const installed = vm.isInstalled(ext.id);
                const on = vm.productivity.has(ext.id as ProductivityId);
                return (
                  <div key={ext.id} className="card flex items-center gap-4 py-3 px-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[13px]">{ext.label}</span>
                        <span className="text-[11px] text-faint font-mono">{ext.id}</span>
                      </div>
                      <p className="text-xs text-muted">{ext.desc}</p>
                    </div>
                    {installed ? (
                      <span className="badge badge-ok shrink-0">Instalada</span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`${ext.label} ${on ? "selecionado" : "não selecionado"}`}
                        className={`toggle shrink-0 ${on ? "on" : ""}`}
                        onClick={() => vm.setProductivity(vm.toggleSet(vm.productivity, ext.id as ProductivityId))}
                      >
                        <div className="toggle-track" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Frontend ───────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-0.5">Frontend — qual framework você usa?</h3>
            <p className="text-xs text-muted mb-3">Extensões oficiais ou mais adotadas por framework</p>
            <FrameworkGrid
              options={FRONTEND_OPTIONS}
              selected={vm.frontend as Set<string>}
              onToggle={(id) => vm.setFrontend(vm.toggleSet(vm.frontend, id as FrontendId))}
              isInstalled={vm.isInstalled}
            />
          </section>

          {/* ── Backend ────────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-0.5">Backend — qual ferramenta você usa?</h3>
            <p className="text-xs text-muted mb-3">Extensões específicas para frameworks e ORMs</p>
            <FrameworkGrid
              options={BACKEND_OPTIONS}
              selected={vm.backend as Set<string>}
              onToggle={(id) => vm.setBackend(vm.toggleSet(vm.backend, id as BackendId))}
              isInstalled={vm.isInstalled}
            />
          </section>

          {/* ── Infraestrutura ─────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-0.5">Infraestrutura — Docker e bancos</h3>
            <p className="text-xs text-muted mb-3">Instala extensões específicas para cada tecnologia</p>
            <FrameworkGrid
              options={STACK_OPTIONS}
              selected={vm.stack as Set<string>}
              onToggle={(id) => vm.setStack(vm.toggleSet(vm.stack, id as StackId))}
              isInstalled={vm.isInstalled}
            />
          </section>

          {/* ── Configurações do editor ────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-3">Configurações do editor</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Formatar ao salvar", desc: "editor.formatOnSave + Prettier como padrão", value: vm.formatOnSave, set: vm.setFormatOnSave },
                { label: "Word wrap",          desc: "Quebra linhas longas automaticamente",       value: vm.wordWrap,    set: vm.setWordWrap },
                { label: "Minimap",            desc: "Mapa de código na lateral direita",          value: vm.minimap,     set: vm.setMinimap },
              ].map(({ label, desc, value, set }) => (
                <div key={label} className="card flex items-center justify-between py-3 px-4">
                  <div>
                    <span className="font-semibold text-[13px]">{label}</span>
                    <p className="text-xs text-faint mt-0.5">{desc}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${label} ${value ? "ativado" : "desativado"}`}
                    className={`toggle ${value ? "on" : ""}`}
                    onClick={() => set((v: boolean) => !v)}
                  >
                    <div className="toggle-track" />
                  </button>
                </div>
              ))}

              <div className="card flex items-center justify-between py-3 px-4">
                <div>
                  <span className="font-semibold text-[13px]">Tamanho do tab</span>
                  <p className="text-xs text-faint mt-0.5">editor.tabSize</p>
                </div>
                <div className="flex items-center gap-2">
                  {[2, 4].map((n) => (
                    <button
                      key={n}
                      className={`btn ${vm.tabSize === n ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "3px 14px", fontSize: 13 }}
                      onClick={() => vm.setTabSize(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {vm.logs.length > 0 && (
            <div className="terminal mb-6">
              {vm.logs.map((l) => (
                <div key={l.id} className={logClass[l.type]}>{l.text}</div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              className="btn btn-primary btn-lg"
              onClick={vm.apply}
              disabled={!vm.hasChanges || vm.running || vm.loading || !vm.status?.cli_available}
            >
              {vm.running ? "Aplicando…" : "Aplicar configurações"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
