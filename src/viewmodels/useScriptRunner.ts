import { useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { LogEntry } from "../models";
import { mkLog } from "../models";

export function useScriptRunner(projectPath: string, packageManager: string) {
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const seqRef = useRef(0);

  async function loadScripts() {
    setLoadingScripts(true);
    try {
      const result = await invoke<Record<string, string>>("read_project_scripts", { path: projectPath });
      setScripts(result);
    } catch {
      setScripts({});
    } finally {
      setLoadingScripts(false);
    }
  }

  function toggleExpand() {
    const next = !expanded;
    setExpanded(next);
    if (next && Object.keys(scripts).length === 0) {
      loadScripts();
    }
  }

  async function runScript(scriptName: string) {
    if (running) return;
    seqRef.current = 0;
    setLogs([]);
    setRunning(scriptName);

    const unlisten = await listen<string>("script-log", (e) => {
      setLogs((l) => [...l, mkLog(seqRef, e.payload)]);
    });

    try {
      await invoke("run_project_script", {
        cwd: projectPath,
        packageManager,
        script: scriptName,
      });
    } catch (err) {
      setLogs((l) => [...l, mkLog(seqRef, `✗ ${err}`)]);
    } finally {
      unlisten();
      setRunning(null);
    }
  }

  return { scripts, loadingScripts, running, logs, expanded, toggleExpand, runScript };
}
