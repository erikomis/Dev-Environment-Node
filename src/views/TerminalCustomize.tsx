import {
  useTerminal,
  PRESET_ALIASES,
} from "../viewmodels/useTerminal";

interface Props {
  onBack: () => void;
}

const CLI_TOOLS = [
  {
    key: "starship" as const,
    label: "Starship",
    icon: "🚀",
    desc: "Prompt moderno e rápido — funciona em qualquer shell (zsh, bash, fish)",
    statusKey: "starship" as const,
    setter: "setInstallStarship" as const,
    stateKey: "installStarship" as const,
  },
  {
    key: "fzf" as const,
    label: "fzf",
    icon: "🔍",
    desc: "Fuzzy finder interativo — busca no histórico com Ctrl+R turbinado",
    statusKey: "fzf" as const,
    setter: "setInstallFzf" as const,
    stateKey: "installFzf" as const,
  },
  {
    key: "bat" as const,
    label: "bat",
    icon: "🦇",
    desc: "Substituto do cat com syntax highlighting e numeração de linhas",
    statusKey: "bat" as const,
    setter: "setInstallBat" as const,
    stateKey: "installBat" as const,
  },
  {
    key: "eza" as const,
    label: "eza",
    icon: "📁",
    desc: "Substituto moderno do ls — cores, ícones e exibição em árvore",
    statusKey: "eza" as const,
    setter: "setInstallEza" as const,
    stateKey: "installEza" as const,
  },
  {
    key: "zoxide" as const,
    label: "zoxide",
    icon: "⚡",
    desc: "cd inteligente — aprende seus diretórios e navega com z <nome>",
    statusKey: "zoxide" as const,
    setter: "setInstallZoxide" as const,
    stateKey: "installZoxide" as const,
  },
] as const;

export default function TerminalCustomize({ onBack }: Readonly<Props>) {
  const vm = useTerminal();
  const logClass = { ok: "t-line hi", err: "t-line error", info: "t-line" };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button className="btn btn-ghost py-1 px-2" onClick={onBack}>← Voltar</button>
        <span className="font-semibold text-[15px]">Customizar Terminal</span>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-xl mx-auto px-8 py-8">

          {/* Status */}
          <div className="card flex items-center gap-4 mb-8">
            <span className="text-3xl">💻</span>
            <div>
              <div className="font-semibold mb-0.5">Shell atual</div>
              {vm.loading ? (
                <span className="text-faint text-xs">detectando…</span>
              ) : (
                <span className="font-mono text-sm text-muted">{vm.status?.current_shell ?? "—"}</span>
              )}
            </div>
          </div>

          {/* ── Oh My Zsh ──────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-3">Oh My Zsh</h3>

            <div className="card mb-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[13px]">Oh My Zsh</span>
                  <p className="text-xs text-faint mt-0.5">Framework para configuração do Zsh com temas e plugins</p>
                </div>
                <div className="flex items-center gap-3">
                  {!vm.loading && (
                    <span className={`badge ${vm.status?.oh_my_zsh ? "badge-ok" : "badge-bad"}`}>
                      {vm.status?.oh_my_zsh ? "Instalado" : "Não instalado"}
                    </span>
                  )}
                  {!vm.loading && !vm.status?.oh_my_zsh && (
                    <button
                      type="button"
                      aria-label={`Oh My Zsh ${vm.installOmz ? "selecionado" : "não selecionado"}`}
                      className={`toggle ${vm.installOmz ? "on" : ""}`}
                      onClick={() => vm.setInstallOmz((v) => !v)}
                    >
                      <div className="toggle-track" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(vm.status?.oh_my_zsh || vm.installOmz) && (
              <div className="flex flex-col gap-2 pl-4 border-l-2 border-border">
                {[
                  {
                    key: "suggestions" as const,
                    installed: vm.status?.zsh_autosuggestions ?? false,
                    enabled: vm.installSuggestions,
                    toggle: () => vm.setInstallSuggestions((v) => !v),
                    label: "zsh-autosuggestions",
                    desc: "Sugere comandos baseados no histórico enquanto digita",
                  },
                  {
                    key: "highlight" as const,
                    installed: vm.status?.zsh_syntax_highlighting ?? false,
                    enabled: vm.installHighlight,
                    toggle: () => vm.setInstallHighlight((v) => !v),
                    label: "zsh-syntax-highlighting",
                    desc: "Coloriza o comando em tempo real enquanto você digita",
                  },
                ].map((plugin) => (
                  <div key={plugin.key} className="card flex items-center gap-3 py-3 px-4">
                    <div className="flex-1">
                      <span className="font-medium text-[13px]">{plugin.label}</span>
                      <p className="text-xs text-faint mt-0.5">{plugin.desc}</p>
                    </div>
                    {plugin.installed ? (
                      <span className="badge badge-ok">Instalado</span>
                    ) : (
                      <button
                        type="button"
                        aria-label={`${plugin.label} ${plugin.enabled ? "selecionado" : "não selecionado"}`}
                        className={`toggle ${plugin.enabled ? "on" : ""}`}
                        onClick={plugin.toggle}
                      >
                        <div className="toggle-track" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Ferramentas CLI ─────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-1">Ferramentas CLI</h3>
            <p className="text-xs text-muted mb-3">
              Utilitários modernos que substituem comandos clássicos e aumentam a produtividade
            </p>
            <div className="flex flex-col gap-2">
              {CLI_TOOLS.map((tool) => {
                const installed = vm.status?.[tool.statusKey] ?? false;
                const enabled = vm[tool.stateKey];
                return (
                  <div key={tool.key} className="card flex items-center gap-4 py-3 px-4">
                    <span className="text-xl w-7 text-center shrink-0">{tool.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-[13px]">{tool.label}</span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">{tool.desc}</p>
                    </div>
                    {vm.loading && <span className="text-faint text-xs shrink-0">…</span>}
                    {!vm.loading && installed && <span className="badge badge-ok shrink-0">Instalado</span>}
                    {!vm.loading && !installed && (
                      <button
                        type="button"
                        aria-label={`${tool.label} ${enabled ? "selecionado" : "não selecionado"}`}
                        className={`toggle shrink-0 ${enabled ? "on" : ""}`}
                        onClick={() => vm[tool.setter]((v: boolean) => !v)}
                      >
                        <div className="toggle-track" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Aliases ────────────────────────────────────────────────────── */}
          <section className="mb-8">
            <h3 className="font-bold text-base mb-1">Aliases</h3>
            <p className="text-xs text-muted mb-3">Selecione os que quer adicionar ao .zshrc / .bashrc</p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {PRESET_ALIASES.map((a) => {
                const on = vm.selectedAliases.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`card-pick text-left flex items-center gap-3 py-3 px-4 ${on ? "selected" : ""}`}
                    onClick={() => vm.toggleAlias(a.id)}
                  >
                    <code className="text-brand font-mono text-[13px] shrink-0 w-10">{a.label}</code>
                    <span className="text-xs text-muted truncate">{a.desc}</span>
                  </button>
                );
              })}
            </div>

            <div className="form-group">
              <label className="label" htmlFor="custom-alias">Alias personalizado</label>
              <input
                id="custom-alias"
                className="input font-mono"
                placeholder='alias meu="meu-comando"'
                value={vm.customAlias}
                onChange={(e) => vm.setCustomAlias(e.target.value)}
              />
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
              disabled={!vm.hasChanges || vm.running || vm.loading}
            >
              {vm.running ? "Aplicando…" : "Aplicar configurações"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
