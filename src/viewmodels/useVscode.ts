import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { VscodeStatus, VscodeSetup, LogEntry } from "../models";
import { mkLog } from "../models";

export { type LogEntry };

// ── Dados de extensões — definidos aqui, consumidos pela view ─────────────────

export const ESSENTIALS = [
  { id: "dbaeumer.vscode-eslint",   label: "ESLint",      desc: "Lint JavaScript/TypeScript em tempo real" },
  { id: "esbenp.prettier-vscode",   label: "Prettier",    desc: "Formatação automática ao salvar" },
  { id: "usernamehw.errorlens",     label: "Error Lens",  desc: "Erros e warnings destacados diretamente na linha" },
  { id: "mikestead.dotenv",         label: "DotENV",      desc: "Syntax highlight e autocomplete em arquivos .env" },
] as const;

export const PRODUCTIVITY = [
  { id: "eamodio.gitlens",                    label: "GitLens",           desc: "Git blame, histórico e autoria inline no editor" },
  { id: "christian-kohler.path-intellisense", label: "Path IntelliSense", desc: "Autocomplete de caminhos em require/import" },
  { id: "rangav.vscode-thunder-client",       label: "Thunder Client",    desc: "Testar endpoints REST sem sair do VSCode" },
] as const;

export const FRONTEND_OPTIONS = [
  {
    id: "react" as const,
    label: "React",
    icon: "⚛️",
    desc: "Snippets ES7+ para componentes, hooks e imports",
    extensions: ["dsznajder.es7-react-js-snippets"],
  },
  {
    id: "vue" as const,
    label: "Vue 3",
    icon: "💚",
    desc: "Volar — extensão oficial (Vetur está depreciado, não usar)",
    extensions: ["Vue.volar"],
  },
  {
    id: "angular" as const,
    label: "Angular",
    icon: "🔴",
    desc: "Angular Language Service oficial — IntelliSense em templates",
    extensions: ["Angular.ng-template"],
  },
  {
    id: "svelte" as const,
    label: "Svelte",
    icon: "🔥",
    desc: "Extensão oficial — syntax, IntelliSense e type checking",
    extensions: ["svelte.svelte-vscode"],
  },
  {
    id: "tailwind" as const,
    label: "Tailwind CSS",
    icon: "🎨",
    desc: "IntelliSense oficial — autocomplete e preview de classes",
    extensions: ["bradlc.vscode-tailwindcss"],
  },
] as const;

export const BACKEND_OPTIONS = [
  {
    id: "nestjs" as const,
    label: "NestJS",
    icon: "🐈",
    desc: "Snippets para modules, controllers, services e decorators",
    extensions: ["ashinzekene.nestjs-snippets"],
  },
  {
    id: "prisma" as const,
    label: "Prisma",
    icon: "▲",
    desc: "Extensão oficial — syntax e formatting do schema.prisma",
    extensions: ["Prisma.prisma"],
  },
  {
    id: "graphql" as const,
    label: "GraphQL",
    icon: "◈",
    desc: "Extensão oficial — syntax, validação e autocomplete em .graphql",
    extensions: ["GraphQL.vscode-graphql", "GraphQL.vscode-graphql-syntax"],
  },
] as const;

export const STACK_OPTIONS = [
  {
    id: "docker" as const,
    label: "Docker",
    icon: "🐳",
    desc: "Gerenciar containers e imagens dentro do editor",
    extensions: ["ms-azuretools.vscode-docker"],
  },
  {
    id: "postgres" as const,
    label: "PostgreSQL",
    icon: "🐘",
    desc: "Cliente SQL integrado (SQLTools + driver PostgreSQL)",
    extensions: ["mtxr.sqltools", "mtxr.sqltools-driver-pg"],
  },
  {
    id: "mysql" as const,
    label: "MySQL",
    icon: "🐬",
    desc: "Cliente SQL integrado (SQLTools + driver MySQL)",
    extensions: ["mtxr.sqltools", "mtxr.sqltools-driver-mysql"],
  },
  {
    id: "mongodb" as const,
    label: "MongoDB",
    icon: "🍃",
    desc: "Cliente MongoDB oficial da própria MongoDB Inc.",
    extensions: ["mongodb.mongodb-vscode"],
  },
] as const;

export const FONTS = [
  { id: "fira-code"      as const, label: "Fira Code",      desc: "A mais popular — => !== -> viram símbolos" },
  { id: "jetbrains-mono" as const, label: "JetBrains Mono", desc: "Criada para código. Muito legível" },
  { id: "none"           as const, label: "Manter atual",   desc: "Não alterar a fonte" },
];

export type EssentialId    = (typeof ESSENTIALS)[number]["id"];
export type ProductivityId = (typeof PRODUCTIVITY)[number]["id"];
export type FrontendId     = (typeof FRONTEND_OPTIONS)[number]["id"];
export type BackendId      = (typeof BACKEND_OPTIONS)[number]["id"];
export type StackId        = (typeof STACK_OPTIONS)[number]["id"];
export type FontId         = "fira-code" | "jetbrains-mono" | "none";

// ── ViewModel ─────────────────────────────────────────────────────────────────

export function useVscode() {
  const [status, setStatus] = useState<VscodeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const seqRef = useRef(0);

  const [essentials, setEssentials]     = useState<Set<EssentialId>>(new Set(ESSENTIALS.map((e) => e.id)));
  const [productivity, setProductivity] = useState<Set<ProductivityId>>(new Set());
  const [frontend, setFrontend]         = useState<Set<FrontendId>>(new Set());
  const [backend, setBackend]           = useState<Set<BackendId>>(new Set());
  const [stack, setStack]               = useState<Set<StackId>>(new Set());
  const [font, setFont]                 = useState<FontId>("fira-code");
  const [installFont, setInstallFont]   = useState(true);
  const [formatOnSave, setFormatOnSave] = useState(true);
  const [tabSize, setTabSize]           = useState(2);
  const [wordWrap, setWordWrap]         = useState(true);
  const [minimap, setMinimap]           = useState(false);

  const detect = () => {
    setLoading(true);
    invoke<VscodeStatus>("check_vscode")
      .then(setStatus)
      .finally(() => setLoading(false));
  };

  useEffect(() => { detect(); }, []);

  const toggleSet = <T extends string>(set: Set<T>, id: T): Set<T> => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  };

  const isInstalled = (id: string) => status?.installed_extensions.includes(id) ?? false;

  const allSelectedExtensions = (): string[] => {
    const ids: string[] = [
      ...Array.from(essentials),
      ...Array.from(productivity),
      ...Array.from(frontend).flatMap((f) => FRONTEND_OPTIONS.find((o) => o.id === f)?.extensions ?? []),
      ...Array.from(backend).flatMap((b) => BACKEND_OPTIONS.find((o) => o.id === b)?.extensions ?? []),
      ...Array.from(stack).flatMap((s) => STACK_OPTIONS.find((o) => o.id === s)?.extensions ?? []),
    ];
    return [...new Set(ids)];
  };

  const apply = async () => {
    setRunning(true);
    setLogs([]);

    const extensions = allSelectedExtensions().filter((id) => !isInstalled(id));
    const setup: VscodeSetup = {
      extensions,
      font,
      install_font: installFont && font !== "none",
      format_on_save: formatOnSave,
      tab_size: tabSize,
      word_wrap: wordWrap,
      minimap,
    };

    try {
      const result = await invoke<string[]>("setup_vscode", { setup });
      setLogs(result.map((t) => mkLog(seqRef, t)));
      detect();
    } catch (err) {
      setLogs([mkLog(seqRef, `✗ ${err}`)]);
    } finally {
      setRunning(false);
    }
  };

  const hasChanges =
    essentials.size > 0 || productivity.size > 0 ||
    frontend.size > 0 || backend.size > 0 ||
    stack.size > 0 || font !== "none";

  return {
    status, loading, running, logs,
    essentials, setEssentials,
    productivity, setProductivity,
    frontend, setFrontend,
    backend, setBackend,
    stack, setStack,
    font, setFont,
    installFont, setInstallFont,
    formatOnSave, setFormatOnSave,
    tabSize, setTabSize,
    wordWrap, setWordWrap,
    minimap, setMinimap,
    hasChanges, isInstalled, toggleSet, apply,
  };
}
