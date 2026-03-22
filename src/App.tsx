import { useState } from "react";
import "./App.css";
import Home from "./views/Home";
import Wizard from "./views/Wizard";
import Dashboard from "./views/Dashboard";
import TerminalCustomize from "./views/TerminalCustomize";
import VscodeCustomize from "./views/VscodeCustomize";
import ShellAliases from "./views/ShellAliases";
import DockerCompose from "./views/DockerCompose";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeProvider";
import { I18nProvider } from "./i18n";
import type { View } from "./models";

function App() {
  const [view, setView] = useState<View>("home");
  const [wizardEnvReady, setWizardEnvReady] = useState(false);
  const home = () => setView("home");

  return (
    <I18nProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <div className="app">
            {view === "home" && (
              <Home
                onStart={(ready) => { setWizardEnvReady(ready); setView("wizard"); }}
                onTerminal={() => setView("terminal")}
                onVscode={() => setView("vscode")}
                onDashboard={() => setView("dashboard")}
                onAliases={() => setView("aliases")}
                onDockerCompose={() => setView("docker-compose")}
              />
            )}
            {view === "wizard"         && <Wizard           onBack={home} envReady={wizardEnvReady} />}
            {view === "terminal"       && <TerminalCustomize onBack={home} />}
            {view === "vscode"         && <VscodeCustomize   onBack={home} />}
            {view === "dashboard"      && <Dashboard         onBack={home} />}
            {view === "aliases"        && <ShellAliases      onBack={home} />}
            {view === "docker-compose" && <DockerCompose     onBack={home} />}
          </div>
        </ErrorBoundary>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
