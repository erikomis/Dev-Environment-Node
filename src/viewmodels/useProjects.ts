import type { CreatedProject, WizardConfig } from "../models";

const STORAGE_KEY = "dev-env-projects";

export function loadProjects(): CreatedProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CreatedProject[]) : [];
  } catch {
    return [];
  }
}

export function saveProject(config: WizardConfig): void {
  const projects = loadProjects();
  const project: CreatedProject = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: config.projectName,
    framework: config.framework,
    path: config.projectPath,
    typescript: config.typescript,
    database: config.database,
    docker: config.docker,
    packageManager: config.packageManager,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...projects, project]));
}

export function clearProjects(): void {
  localStorage.removeItem(STORAGE_KEY);
}
