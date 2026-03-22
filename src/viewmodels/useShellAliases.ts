import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ShellAlias } from "../models";

const STORAGE_KEY = "dev-env-aliases";

const PRESET_ALIASES: ShellAlias[] = [
  // Docker
  { id: "dcu",  name: "dcu",  command: "docker-compose up -d",   description: "docker-compose up detached",      category: "docker" },
  { id: "dcd",  name: "dcd",  command: "docker-compose down",    description: "docker-compose down",             category: "docker" },
  { id: "dcl",  name: "dcl",  command: "docker-compose logs -f", description: "Logs em tempo real",              category: "docker" },
  { id: "dps",  name: "dps",  command: "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'", description: "Lista containers ativos", category: "docker" },
  { id: "dex",  name: "dex",  command: "docker exec -it",        description: "Entra em um container",           category: "docker" },
  { id: "dprune", name: "dprune", command: "docker system prune -f", description: "Limpa recursos não usados",   category: "docker" },
  // Git
  { id: "gs",   name: "gs",   command: "git status",             description: "git status",                      category: "git" },
  { id: "ga",   name: "ga",   command: "git add .",              description: "Adiciona todos os arquivos",      category: "git" },
  { id: "gcm",  name: "gcm",  command: "git commit -m",          description: "Commit com mensagem",             category: "git" },
  { id: "gp",   name: "gp",   command: "git push",               description: "Push para o remoto",             category: "git" },
  { id: "gl",   name: "gl",   command: "git log --oneline --graph --decorate -20", description: "Log visual", category: "git" },
  // Node
  { id: "ni",   name: "ni",   command: "npm install",            description: "npm install",                     category: "node" },
  { id: "nrd",  name: "nrd",  command: "npm run dev",            description: "npm run dev",                     category: "node" },
  { id: "nrb",  name: "nrb",  command: "npm run build",          description: "npm run build",                   category: "node" },
  { id: "nrt",  name: "nrt",  command: "npm run test",           description: "npm run test",                    category: "node" },
];

export { PRESET_ALIASES };

function loadAliases(): ShellAlias[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ShellAlias[]) : [];
  } catch {
    return [];
  }
}

function persistAliases(aliases: ShellAlias[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(aliases));
}

export function useShellAliases() {
  const [aliases, setAliases] = useState<ShellAlias[]>(loadAliases);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

  function addPreset(preset: ShellAlias) {
    if (aliases.some((a) => a.id === preset.id)) return;
    const updated = [...aliases, preset];
    setAliases(updated);
    persistAliases(updated);
  }

  function addCustom(name: string, command: string) {
    if (!name.trim() || !command.trim()) return;
    const alias: ShellAlias = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      command: command.trim(),
      category: "custom",
    };
    const updated = [...aliases, alias];
    setAliases(updated);
    persistAliases(updated);
  }

  function remove(id: string) {
    const updated = aliases.filter((a) => a.id !== id);
    setAliases(updated);
    persistAliases(updated);
  }

  function hasPreset(id: string) {
    return aliases.some((a) => a.id === id);
  }

  async function saveToShell() {
    setSaving(true);
    setSaveResult(null);
    try {
      const result = await invoke<string>("write_shell_aliases", {
        aliases: aliases.map((a) => ({ name: a.name, command: a.command })),
      });
      setSaveResult(result);
    } catch (err) {
      setSaveResult(`✗ ${err}`);
    } finally {
      setSaving(false);
    }
  }

  const byCategory = (cat: ShellAlias["category"]) => aliases.filter((a) => a.category === cat);
  const presetsByCategory = (cat: ShellAlias["category"]) =>
    PRESET_ALIASES.filter((p) => p.category === cat);

  return {
    aliases,
    saving,
    saveResult,
    addPreset,
    addCustom,
    remove,
    hasPreset,
    saveToShell,
    byCategory,
    presetsByCategory,
  };
}
