import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { EnvStatus } from "../models";

export interface ToolInfo {
  label: string;
  icon: string;
  installed: boolean;
  badge: string | null;
  version: string | null;
}

export function useHome() {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<EnvStatus>("check_environment")
      .then(setEnv)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const allReady = Boolean(env?.node && env?.git);

  const tools: ToolInfo[] = [
    {
      label: "Node.js",
      icon: "⬡",
      installed: env?.node ?? false,
      badge: env?.node_via_nvm ? "via nvm" : null,
      version: env?.node_version ?? null,
    },
    {
      label: "Docker",
      icon: "🐳",
      installed: env?.docker ?? false,
      badge: null,
      version: env?.docker_version?.split(",")[0] ?? null,
    },
    {
      label: "Git",
      icon: "⌥",
      installed: env?.git ?? false,
      badge: null,
      version: env?.git_version?.replace("git version ", "") ?? null,
    },
  ];

  return { env, loading, allReady, tools };
}
