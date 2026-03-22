import type { ProjectTemplate, WizardConfig } from "../models";

const STORAGE_KEY = "dev-env-templates";

export function loadTemplates(): ProjectTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProjectTemplate[]) : [];
  } catch {
    return [];
  }
}

export function saveTemplate(name: string, config: WizardConfig): ProjectTemplate {
  const templates = loadTemplates();
  const template: ProjectTemplate = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    config: { ...config },
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...templates, template]));
  return template;
}

export function deleteTemplate(id: string): void {
  const templates = loadTemplates().filter((t) => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}
