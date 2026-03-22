// ── Ambiente ──────────────────────────────────────────────────────────────────
export interface EnvStatus {
  node: boolean;
  node_via_nvm: boolean;
  nvm: boolean;
  docker: boolean;
  orbstack: boolean;
  git: boolean;
  node_version: string | null;
  docker_version: string | null;
  git_version: string | null;
  nvm_in_shell: boolean;
  git_name: string | null;
  git_email: string | null;
  yarn: boolean;
  pnpm: boolean;
  ssh_key: boolean;
  ssh_public_key: string | null;
}

export interface ShellFix {
  add_nvm_to_shell: boolean;
  git_name: string | null;
  git_email: string | null;
  install_yarn: boolean;
  install_pnpm: boolean;
}

// ── Wizard ────────────────────────────────────────────────────────────────────
export type Framework = "express" | "fastify" | "nestjs" | "angular" | "next" | "nuxt" | "vite";
export type ViteTemplate = "react-ts" | "vue-ts" | "svelte-ts" | "vanilla-ts";
export type MonorepoTool = "turborepo" | "nx";

export interface WizardConfig {
  framework: Framework;
  viteTemplate: ViteTemplate;
  typescript: boolean;
  tsStrict: boolean;
  tsTarget: "ES2020" | "ES2022" | "ESNext";
  packageManager: "npm" | "yarn" | "pnpm";
  docker: boolean;
  docker_tool: "docker" | "orbstack";
  database: "none" | "postgres" | "mysql" | "mongodb";
  projectName: string;
  projectPath: string;
  monorepo: boolean;
  monorepoTool: MonorepoTool;
  overwrite: boolean;
}

// ── Terminal ──────────────────────────────────────────────────────────────────
export interface TerminalStatus {
  current_shell: string;
  shell_name: string;
  oh_my_zsh: boolean;
  zsh_autosuggestions: boolean;
  zsh_syntax_highlighting: boolean;
  starship: boolean;
  fzf: boolean;
  bat: boolean;
  eza: boolean;
  zoxide: boolean;
}

export interface TerminalSetup {
  install_oh_my_zsh: boolean;
  install_autosuggestions: boolean;
  install_syntax_highlighting: boolean;
  install_starship: boolean;
  install_fzf: boolean;
  install_bat: boolean;
  install_eza: boolean;
  install_zoxide: boolean;
  aliases: string[];
}

// ── VSCode ────────────────────────────────────────────────────────────────────
export interface VscodeStatus {
  installed: boolean;
  cli_available: boolean;
  version: string | null;
  settings_path: string | null;
  fira_code_installed: boolean;
  jetbrains_mono_installed: boolean;
  installed_extensions: string[];
}

export interface VscodeSetup {
  extensions: string[];
  font: string;
  install_font: boolean;
  format_on_save: boolean;
  tab_size: number;
  word_wrap: boolean;
  minimap: boolean;
}

// ── Shell Aliases ─────────────────────────────────────────────────────────────
export interface ShellAlias {
  id: string;
  name: string;
  command: string;
  description?: string;
  category: "docker" | "git" | "node" | "custom";
}

// ── Docker Compose ────────────────────────────────────────────────────────────
export type DockerServiceName = "postgres" | "mysql" | "mongodb" | "redis" | "rabbitmq" | "nginx" | "elasticsearch";

export interface DockerService {
  id: DockerServiceName;
  enabled: boolean;
  port: string;
  version: string;
}

// ── Templates ─────────────────────────────────────────────────────────────────
export interface ProjectTemplate {
  id: string;
  name: string;
  config: WizardConfig;
  createdAt: string;
}

// ── Navegação ─────────────────────────────────────────────────────────────────
export type View = "home" | "wizard" | "terminal" | "vscode" | "dashboard" | "aliases" | "docker-compose";
export type WizardStep = 0 | 1 | 2 | 3;

// ── Projetos criados ──────────────────────────────────────────────────────────
export interface CreatedProject {
  id: string;
  name: string;
  framework: Framework;
  path: string;
  typescript: boolean;
  database: string;
  docker: boolean;
  packageManager: string;
  createdAt: string; // ISO date string
}

// ── Shared ────────────────────────────────────────────────────────────────────
export interface LogEntry {
  id: number;
  text: string;
  type: "ok" | "err" | "info";
}

export function mkLog(seq: { current: number }, text: string): LogEntry {
  let type: LogEntry["type"] = "info";
  if (text.startsWith("✅")) type = "ok";
  else if (text.startsWith("✗")) type = "err";
  return { id: ++seq.current, text, type };
}
