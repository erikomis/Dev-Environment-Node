import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { WizardConfig } from "../models";

const NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;

export function isValidName(name: string): boolean {
  return NAME_RE.test(name) && !name.includes("..");
}

async function findFreeName(base: string, path: string): Promise<string> {
  let candidate = base;
  let i = 1;
  while (await invoke<boolean>("path_exists", { path: `${path}/${candidate}` })) {
    candidate = `${base}-${i}`;
    i++;
  }
  return candidate;
}

export type ConflictResolution = "overwrite" | "rename" | null;

export function useStepProject(config: WizardConfig, onChange: (p: Partial<WizardConfig>) => void) {
  const [os, setOs] = useState<string>("");
  const [pathExists, setPathExists] = useState(false);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolution>(null);

  useEffect(() => {
    invoke<string>("get_os").then(setOs).catch(() => {});
    if (!config.projectPath) {
      invoke<string>("run_command", { program: "sh", args: ["-c", "echo $HOME"], cwd: null })
        .then((home) => onChange({ projectPath: `${home.trim()}/projetos` }))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Verifica se o diretório já existe sempre que nome ou caminho mudar
  useEffect(() => {
    const fullPath = config.projectPath && config.projectName
      ? `${config.projectPath}/${config.projectName}`
      : null;

    if (!fullPath || !isValidName(config.projectName)) {
      setPathExists(false);
      setConflictResolution(null);
      return;
    }

    let cancelled = false;
    invoke<boolean>("path_exists", { path: fullPath })
      .then((exists) => {
        if (!cancelled) {
          setPathExists(exists);
          if (!exists) setConflictResolution(null);
        }
      })
      .catch(() => { if (!cancelled) setPathExists(false); });

    return () => { cancelled = true; };
  }, [config.projectPath, config.projectName]);

  async function resolveConflict(resolution: ConflictResolution) {
    if (resolution === "overwrite") {
      onChange({ overwrite: true });
      setConflictResolution("overwrite");
    } else if (resolution === "rename") {
      const freeName = await findFreeName(config.projectName, config.projectPath);
      onChange({ projectName: freeName, overwrite: false });
      setConflictResolution(null);
    } else {
      onChange({ overwrite: false });
      setConflictResolution(null);
    }
  }

  const nameValid   = isValidName(config.projectName);
  const canContinue = nameValid
    && config.projectPath.trim().length > 0
    && (!pathExists || conflictResolution === "overwrite");
  const nameError   = config.projectName.length > 0 && !nameValid
    ? "Use apenas letras minúsculas, números, '-', '_' ou '.'"
    : null;
  const fullPath = config.projectPath && config.projectName
    ? `${config.projectPath}/${config.projectName}`
    : null;

  return { os, nameValid, canContinue, nameError, fullPath, pathExists, conflictResolution, resolveConflict };
}
