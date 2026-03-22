import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { EnvStatus, WizardConfig, LogEntry } from "../models";
import { mkLog } from "../models";
import { saveProject } from "./useProjects";

export type InstallStatus = "idle" | "running" | "done" | "error";
export type { LogEntry } from "../models";

export function useStepInstall() {
  const [status, setStatus] = useState<InstallStatus>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const seqRef = useRef(0);

  function addLog(text: string) {
    setLogs((l) => [...l, mkLog(seqRef, text)]);
  }

  const run = async (config: WizardConfig) => {
    setStatus("running");
    setLogs([]);
    setProgress(0);
    seqRef.current = 0;

    // Listen to streaming log events from Rust
    const unlisten = await listen<string>("install-log", (event) => {
      addLog(event.payload);
    });

    try {
      addLog("→ Verificando ambiente…");
      const env: EnvStatus = await invoke("check_environment");
      setProgress(5);

      // ── Node ──────────────────────────────────────────────────────────────
      if (env.node) {
        addLog(`→ Node.js detectado: ${env.node_version ?? ""} ${env.node_via_nvm ? "(via nvm)" : "(direto)"}`);
      } else {
        addLog("⚠ Node.js não encontrado — iniciando instalação via nvm…");
        setProgress(8);
        await invoke("run_installer");   // emits install-log events
        const envAfter: EnvStatus = await invoke("check_environment");
        if (!envAfter.node) {
          throw new Error("Node.js não foi instalado. Reinicie o terminal e tente novamente.");
        }
        addLog("✅ Node.js instalado com sucesso!");
      }
      setProgress(20);

      // ── Docker ────────────────────────────────────────────────────────────
      if (config.docker && !env.docker) {
        const toolLabel = config.docker_tool === "orbstack" ? "OrbStack" : "Docker Desktop";
        addLog(`→ Docker não encontrado — instalando ${toolLabel}…`);
        await invoke("install_docker_tool", { tool: config.docker_tool }); // emits install-log events
      }
      setProgress(30);

      // ── Project ───────────────────────────────────────────────────────────
      addLog(`→ Criando projeto '${config.projectName}'…`);
      setProgress(35);
      addLog(`→ ${config.framework} · TypeScript: ${config.typescript ? "sim" : "não"} · ${config.packageManager}`);

      await invoke("create_project", {
        config: {
          name:            config.projectName,
          path:            config.projectPath,
          framework:       config.framework,
          typescript:      config.typescript,
          ts_strict:       config.tsStrict,
          ts_target:       config.tsTarget,
          package_manager: config.packageManager,
          database:        config.database,
          docker:          config.docker,
          vite_template:   config.viteTemplate,
          monorepo:        config.monorepo,
          monorepo_tool:   config.monorepoTool,
          overwrite:       config.overwrite,
        },
      });
      setProgress(65);

      // ── Deps ──────────────────────────────────────────────────────────────
      addLog(`→ Instalando dependências (${config.packageManager} install)…`);
      const installOut: string = await invoke("run_command", {
        program: config.packageManager,
        args: ["install"],
        cwd: `${config.projectPath}/${config.projectName}`,
      });
      const lastLine = installOut.trim().split("\n").at(-1);
      if (lastLine) addLog(`  ${lastLine}`);
      setProgress(100);

      addLog("✅ Projeto criado com sucesso!");
      saveProject(config);
      setStatus("done");
    } catch (err) {
      addLog(`✗ Erro: ${err}`);
      setStatus("error");
    } finally {
      unlisten();
    }
  };

  return { status, logs, progress, run };
}
