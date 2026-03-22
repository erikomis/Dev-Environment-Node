import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EnvStatus, ShellFix } from "../models";

export interface ToolInfo {
  label: string;
  icon: string;
  description: string;
  required: boolean;
  installed: boolean;
  detail: string | null;
}

export interface GitState {
  name: string;
  email: string;
  editing: boolean;
}

function nodeDetail(env: EnvStatus): string {
  if (!env.node) return "Será instalado via nvm";
  if (env.node_via_nvm) return `${env.node_version ?? ""} · via nvm`;
  return `${env.node_version ?? ""} · instalação direta`;
}

function buildTools(env: EnvStatus | null): ToolInfo[] {
  return [
    {
      label: "Node.js",
      icon: "⬡",
      description: "Runtime JavaScript — gerenciado pelo nvm",
      required: true,
      installed: env?.node ?? false,
      detail: env ? nodeDetail(env) : null,
    },
    {
      label: "Docker",
      icon: "🐳",
      description: "Containers e ambientes isolados",
      required: false,
      installed: env?.docker ?? false,
      detail: env?.docker_version?.split(",")[0] ?? null,
    },
    {
      label: "Git",
      icon: "⌥",
      description: "Controle de versão",
      required: true,
      installed: env?.git ?? false,
      detail: env?.git_version?.replace("git version ", "") ?? null,
    },
  ];
}

export function useStepDetect() {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixLogs, setFixLogs] = useState<string[]>([]);
  const [git, setGit] = useState<GitState>({ name: "", email: "", editing: false });
  const [sshGenerating, setSshGenerating] = useState(false);
  const [sshConfirming, setSshConfirming] = useState(false);
  const [sshNewKeyPath, setSshNewKeyPath] = useState<string | null>(null);

  const detect = () => {
    setLoading(true);
    invoke<EnvStatus>("check_environment")
      .then((e) => {
        setEnv(e);
        setGit((g) => ({ ...g, name: e.git_name ?? "", email: e.git_email ?? "" }));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { detect(); }, []);

  const applyFix = async (fix: Partial<ShellFix>, label: string) => {
    setFixing(label);
    setFixLogs([]);
    try {
      const payload: ShellFix = {
        add_nvm_to_shell: false,
        git_name: null,
        git_email: null,
        install_yarn: false,
        install_pnpm: false,
        ...fix,
      };
      const logs = await invoke<string[]>("fix_shell_config", { fix: payload });
      setFixLogs(logs);
      detect();
    } catch (err) {
      setFixLogs([`✗ ${err}`]);
    } finally {
      setFixing(null);
    }
  };

  const generateSshKey = async (email: string, force = false, keyName?: string) => {
    setSshGenerating(true);
    setSshConfirming(false);
    setSshNewKeyPath(null);
    setFixLogs([]);
    try {
      const pubKey = await invoke<string>("generate_ssh_key", { email, force, keyName: keyName ?? null });
      let label: string;
      if (force) label = "substituída";
      else if (keyName) label = `criada em ~/.ssh/${keyName}`;
      else label = "gerada";
      setFixLogs([`✅ Chave SSH ${label}! Adicione ao GitHub → Settings → SSH keys`]);
      if (keyName) {
        setSshNewKeyPath(`~/.ssh/${keyName}`);
      }
      setEnv((e) => e ? { ...e, ssh_key: true, ssh_public_key: pubKey } : e);
    } catch (err) {
      setFixLogs([`✗ ${err}`]);
    } finally {
      setSshGenerating(false);
    }
  };

  const tools = buildTools(env);
  const missingRequired = tools.some((t) => t.required && !t.installed);

  return {
    env, loading, fixing, fixLogs, git, setGit,
    tools, missingRequired, detect, applyFix,
    sshGenerating, sshConfirming, setSshConfirming, sshNewKeyPath, generateSshKey,
  };
}
