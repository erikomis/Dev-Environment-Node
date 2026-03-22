import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { CreatedProject } from "../models";
import { loadProjects, clearProjects } from "./useProjects";

export function useDashboard() {
  const [projects, setProjects] = useState<CreatedProject[]>(loadProjects);
  const [confirmClear, setConfirmClear] = useState(false);

  function requestClear() {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearProjects();
    setProjects([]);
    setConfirmClear(false);
  }

  function cancelClear() {
    setConfirmClear(false);
  }

  async function openFolder(fullPath: string) {
    await invoke("open_folder", { path: fullPath }).catch(() => {});
  }

  return { projects, confirmClear, requestClear, cancelClear, openFolder };
}
