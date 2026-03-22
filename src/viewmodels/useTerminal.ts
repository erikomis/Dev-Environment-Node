import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { TerminalStatus, TerminalSetup, LogEntry } from "../models";
import { mkLog } from "../models";

export { type LogEntry };

export const PRESET_ALIASES = [
  { id: "gs",  alias: 'alias gs="git status"',            label: "gs",   desc: "git status" },
  { id: "ga",  alias: 'alias ga="git add ."',              label: "ga",   desc: "git add ." },
  { id: "gp",  alias: 'alias gp="git push"',               label: "gp",   desc: "git push" },
  { id: "gpl", alias: 'alias gpl="git pull"',              label: "gpl",  desc: "git pull" },
  { id: "gl",  alias: 'alias gl="git log --oneline -10"',  label: "gl",   desc: "git log resumido" },
  { id: "gco", alias: 'alias gco="git checkout"',          label: "gco",  desc: "git checkout" },
  { id: "ll",  alias: 'alias ll="ls -la"',                 label: "ll",   desc: "ls -la" },
  { id: "dev", alias: 'alias dev="npm run dev"',           label: "dev",  desc: "npm run dev" },
  { id: "ni",  alias: 'alias ni="npm install"',            label: "ni",   desc: "npm install" },
  { id: "up",  alias: 'alias ..="cd .."',                  label: "..",   desc: "cd .." },
  { id: "up2", alias: 'alias ...="cd ../.."',              label: "...",  desc: "cd ../.." },
] as const;

export type PresetId = (typeof PRESET_ALIASES)[number]["id"];

export function useTerminal() {
  const [status, setStatus] = useState<TerminalStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const seqRef = useRef(0);

  // Oh My Zsh
  const [installOmz, setInstallOmz] = useState(false);
  const [installSuggestions, setInstallSuggestions] = useState(false);
  const [installHighlight, setInstallHighlight] = useState(false);

  // CLI tools
  const [installStarship, setInstallStarship] = useState(false);
  const [installFzf, setInstallFzf] = useState(false);
  const [installBat, setInstallBat] = useState(false);
  const [installEza, setInstallEza] = useState(false);
  const [installZoxide, setInstallZoxide] = useState(false);

  // Aliases
  const [selectedAliases, setSelectedAliases] = useState<Set<PresetId>>(new Set());
  const [customAlias, setCustomAlias] = useState("");

  const detect = () => {
    setLoading(true);
    invoke<TerminalStatus>("check_terminal")
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => { detect(); }, []);

  const toggleAlias = (id: PresetId) =>
    setSelectedAliases((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const apply = async () => {
    setRunning(true);
    setLogs([]);

    const aliasLines: string[] = PRESET_ALIASES
      .filter((a) => selectedAliases.has(a.id))
      .map((a) => a.alias);
    if (customAlias.trim()) aliasLines.push(customAlias.trim());

    const setup: TerminalSetup = {
      install_oh_my_zsh: installOmz,
      install_autosuggestions: installSuggestions,
      install_syntax_highlighting: installHighlight,
      install_starship: installStarship,
      install_fzf: installFzf,
      install_bat: installBat,
      install_eza: installEza,
      install_zoxide: installZoxide,
      aliases: aliasLines,
    };

    try {
      const result = await invoke<string[]>("setup_terminal", { setup });
      setLogs(result.map((t) => mkLog(seqRef, t)));
      detect();
    } catch (err) {
      setLogs([mkLog(seqRef, `✗ ${err}`)]);
    } finally {
      setRunning(false);
    }
  };

  const hasChanges =
    installOmz || installSuggestions || installHighlight ||
    installStarship || installFzf || installBat || installEza || installZoxide ||
    selectedAliases.size > 0 || customAlias.trim().length > 0;

  return {
    status, loading, running, logs,
    installOmz, setInstallOmz,
    installSuggestions, setInstallSuggestions,
    installHighlight, setInstallHighlight,
    installStarship, setInstallStarship,
    installFzf, setInstallFzf,
    installBat, setInstallBat,
    installEza, setInstallEza,
    installZoxide, setInstallZoxide,
    selectedAliases, toggleAlias,
    customAlias, setCustomAlias,
    hasChanges, apply,
  };
}
