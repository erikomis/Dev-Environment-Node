import { useHome } from "../viewmodels/useHome";
import { useI18n } from "../i18n";
import { useTheme } from "../contexts/useTheme";

interface Props {
  onStart: (envReady: boolean) => void;
  onTerminal: () => void;
  onVscode: () => void;
  onDashboard: () => void;
  onAliases: () => void;
  onDockerCompose: () => void;
}

export default function Home({ onStart, onTerminal, onVscode, onDashboard, onAliases, onDockerCompose }: Readonly<Props>) {
  const { loading, allReady, tools } = useHome();
  const { t, locale, setLocale } = useI18n();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-black font-bold text-base">
          N
        </div>
        <span className="font-semibold text-[15px]">Dev Environment Node</span>
        <span className="ml-auto text-xs text-faint font-mono">v0.1.0</span>

        {/* Locale toggle */}
        <button
          className="btn btn-ghost py-1 px-2 text-xs"
          onClick={() => setLocale(locale === "pt-br" ? "en" : "pt-br")}
          title={locale === "pt-br" ? "Switch to English" : "Mudar para Português"}
        >
          {locale === "pt-br" ? "EN" : "PT"}
        </button>

        {/* Theme toggle */}
        <button
          className="btn btn-ghost py-1 px-2 text-base"
          onClick={toggle}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-12 gap-8">
        <div className="text-center max-w-md">
          <h1 className="text-[28px] font-bold tracking-tight mb-3">
            {t.home.title}{" "}
            <span className="text-brand">{t.home.titleHighlight}</span>
          </h1>
          <p className="text-muted text-[15px] leading-relaxed">
            {t.home.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 w-full max-w-md">
          {tools.map((tool) => (
            <div key={tool.label} className="card text-center">
              <div className="text-xl mb-2">{tool.icon}</div>
              <div className="font-semibold text-[13px] mb-2">{tool.label}</div>
              {loading ? (
                <span className="text-faint text-xs">…</span>
              ) : (
                <span className={`badge ${tool.installed ? "badge-ok" : "badge-bad"}`}>
                  {tool.installed ? t.ok : t.missing}
                </span>
              )}
              {tool.badge && (
                <div className="mt-1.5">
                  <span className="badge badge-info">{tool.badge}</span>
                </div>
              )}
              {tool.version && (
                <div className="mt-1.5 text-[11px] text-faint font-mono truncate">
                  {tool.version}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3">
          <button className="btn btn-primary btn-lg" onClick={() => onStart(allReady)} disabled={loading}>
            {loading ? t.home.detectingEnv : t.home.configureEnv}
          </button>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={onTerminal} disabled={loading}>
              {t.home.customizeTerminal}
            </button>
            <button className="btn btn-secondary" onClick={onVscode} disabled={loading}>
              {t.home.configureVscode}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            <button className="btn btn-ghost" onClick={onAliases}>
              {t.home.shellAliases}
            </button>
            <button className="btn btn-ghost" onClick={onDockerCompose}>
              {t.home.dockerCompose}
            </button>
            <button className="btn btn-ghost" onClick={onDashboard}>
              {t.home.viewProjects}
            </button>
          </div>
          {!loading && !allReady && (
            <p className="text-xs text-warn">{t.home.missingTools}</p>
          )}
          {!loading && allReady && (
            <p className="text-xs text-ok">{t.home.envReady}</p>
          )}
        </div>
      </main>

      <footer className="flex items-center justify-center gap-2 px-6 py-3 border-t border-border text-xs text-faint">
        {t.home.tagline}
      </footer>
    </div>
  );
}
