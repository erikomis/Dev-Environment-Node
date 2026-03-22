# Dev Environment Node

> App desktop para configurar um ambiente Node.js completo **sem abrir o terminal** — do zero ao projeto rodando em 4 cliques.

![Status](https://img.shields.io/badge/status-alpha-orange)
![Versão](https://img.shields.io/badge/versão-0.1.0-blue)
![Plataformas](https://img.shields.io/badge/plataformas-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Stack](https://img.shields.io/badge/Tauri%20v2-React%2019%20%2B%20Rust-blueviolet)

---

## O problema

Configurar um ambiente Node do zero envolve:

- Instalar Node.js e gerenciar versões com nvm
- Configurar Docker, variáveis de ambiente e estrutura de projeto
- Escolher o framework certo com as dependências corretas
- Personalizar o terminal e o VSCode

É repetitivo, sujeito a erros e intimidador para quem está começando.

## A solução

Uma interface gráfica guiada que executa tudo automaticamente:

1. Abre o app
2. Clica em **Configurar Ambiente** (wizard) ou acessa Terminal / VSCode individualmente
3. Segue as telas e define suas preferências
4. Ambiente e projeto prontos

Sem comandos. Sem copiar e colar do Stack Overflow.

---

## Funcionalidades

### Wizard — Criar Projeto (4 etapas)

| Etapa | O que faz |
| --- | --- |
| **1 — Detectar** | Inspeciona Node, nvm, Docker, Git, SSH key e configura identidade Git |
| **2 — Stack** | Escolhe framework, TypeScript, package manager e monorepo |
| **3 — Projeto** | Define nome, caminho, banco de dados e Docker |
| **4 — Instalar** | Cria o projeto e instala dependências com log em tempo real |

#### Frameworks suportados

| Categoria | Frameworks |
| --- | --- |
| Backend | Express, Fastify, NestJS |
| Frontend & Full-stack | Next.js, Nuxt, Angular, Vite (React / Vue / Svelte / Vanilla) |

#### Monorepo

Ativa o toggle **Monorepo** na etapa Stack para usar **Turborepo** ou **Nx** como ferramenta de workspace. O framework escolhido torna-se o app principal dentro do workspace.

#### TypeScript

- Ativado por padrão (obrigatório para NestJS, Angular, Next.js e Nuxt)
- Opções de **strict mode** e **target** (`ES2020` / `ES2022` / `ESNext`) para Express e Fastify
- `tsconfig.json` gerado automaticamente com as configurações escolhidas

#### Banco de dados & Docker

- Bancos: PostgreSQL, MySQL, MongoDB — `.env` e dependências incluídos
- Docker: `Dockerfile` + `docker-compose.yml` gerados opcionalmente
- Ferramenta Docker: **Docker Desktop** ou **OrbStack** (macOS) — instalação automática com verificação de pré-requisitos por OS
  - **macOS**: verifica Homebrew e versão mínima do sistema (12+ para Docker Desktop, 13+ para OrbStack)
  - **Linux**: verifica arquitetura 64-bit, curl ou package manager, inicia o daemon e adiciona o usuário ao grupo `docker`
  - **Windows**: verifica build do Windows (19045+), RAM (8 GB+), virtualização no firmware (VT-x/AMD-V) e WSL 2.1.5+ — instala ou atualiza o WSL automaticamente se necessário

---

### Terminal

Personaliza o shell com:

| Ferramenta | Descrição |
| --- | --- |
| Oh My Zsh | Framework de configuração para Zsh |
| zsh-autosuggestions | Sugestões de comandos baseadas no histórico |
| zsh-syntax-highlighting | Highlight de sintaxe em tempo real |
| Starship | Prompt minimalista e ultra-rápido para qualquer shell |
| fzf | Fuzzy finder interativo para histórico e arquivos |
| bat | `cat` com syntax highlighting e numeração de linhas |
| eza | `ls` moderno com ícones e suporte a Git |
| zoxide | `cd` inteligente que aprende seus diretórios mais usados |

Aliases personalizados também podem ser adicionados diretamente pela interface.

---

### VSCode

| Configuração | Detalhes |
| --- | --- |
| Extensões | ESLint, Prettier, GitLens, Error Lens, Path Intellisense, Docker e outras |
| Fonte | Fira Code ou JetBrains Mono com ligatures instalada automaticamente |
| settings.json | Format on save, tab size, word wrap, minimap |

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Desktop | [Tauri v2](https://tauri.app) |
| Frontend | React 19 + TypeScript + Tailwind v4 |
| Backend | Rust |
| Arquitetura | MVVM — `models/` · `viewmodels/` · `views/` |
| Plataformas | macOS · Linux · Windows |

---

## Rodando em desenvolvimento

**Pré-requisitos:**

- [Node.js](https://nodejs.org) 18+
- [Rust](https://rustup.rs) via `rustup`
- Dependências nativas do Tauri → [Prerequisites](https://tauri.app/start/prerequisites/)

```bash
npm install
npm run tauri dev
```

Mudanças no React têm hot-reload imediato. Mudanças no Rust recompilam o backend automaticamente.

## Build para produção

```bash
npm run tauri build
```

Instalador gerado em `src-tauri/target/release/bundle/`.

---

## Estrutura do projeto

```text
dev-env-node/
├── src/                              # Frontend React
│   ├── models/
│   │   └── index.ts                  # Tipos e interfaces compartilhados
│   ├── viewmodels/
│   │   ├── useHome.ts                # Lógica da tela inicial
│   │   ├── useStepDetect.ts          # Detecção de ambiente e SSH
│   │   ├── useStepProject.ts         # Validação de nome e conflitos de path
│   │   ├── useStepInstall.ts         # Orquestra a criação do projeto
│   │   ├── useTerminal.ts            # Lógica de configuração do terminal
│   │   └── useVscode.ts              # Lógica de configuração do VSCode
│   ├── views/
│   │   ├── Home.tsx                  # Tela inicial com status do ambiente
│   │   ├── Wizard.tsx                # Container do wizard (4 etapas)
│   │   ├── TerminalCustomize.tsx     # Tela de personalização do terminal
│   │   ├── VscodeCustomize.tsx       # Tela de personalização do VSCode
│   │   └── steps/
│   │       ├── StepDetect.tsx        # Etapa 1 — detectar ferramentas e chave SSH
│   │       ├── StepStack.tsx         # Etapa 2 — escolher stack
│   │       ├── StepProject.tsx       # Etapa 3 — configurar projeto
│   │       └── StepInstall.tsx       # Etapa 4 — instalar e criar
│   ├── test/
│   │   ├── setup.ts                  # Vitest globals + mock Tauri IPC
│   │   ├── models.test.ts            # Testes de utilidades de modelo
│   │   ├── useStepProject.test.ts    # Testes de validação de nome de projeto
│   │   ├── useTerminal.test.ts       # Testes do viewmodel de terminal
│   │   └── SshKeyCard.test.tsx       # Testes do componente de chave SSH
│   ├── App.tsx
│   └── App.css                       # Design system (Tailwind v4 + tokens)
└── src-tauri/
    └── src/
        └── lib.rs                    # Comandos IPC + testes unitários Rust
```

---

## Comandos Rust expostos ao frontend

| Comando | Descrição |
| --- | --- |
| `check_environment` | Detecta Node, nvm, Docker, OrbStack, Git, yarn/pnpm, chave SSH e versões |
| `get_os` | Retorna o OS atual (`macos`, `linux`, `windows`) |
| `path_exists` | Verifica se um caminho existe no sistema de arquivos |
| `fix_shell_config` | Adiciona nvm ao shell, configura Git name/email, instala yarn/pnpm |
| `generate_ssh_key` | Gera chave ed25519; suporta `force=true` para sobrescrever |
| `create_project` | Cria projeto via CLI ou estrutura manual conforme o framework |
| `run_installer` | Instala Node.js via nvm no OS detectado |
| `run_command` | Executa comandos da lista de permissões com PATH completo |
| `check_docker_prerequisites` | Verifica pré-requisitos para instalar Docker/OrbStack por OS (versão do SO, RAM, virtualização, WSL, Homebrew) |
| `install_docker_tool` | Instala Docker Desktop ou OrbStack; no Windows instala/atualiza o WSL automaticamente se necessário |
| `check_terminal` | Detecta Oh My Zsh e ferramentas CLI instaladas |
| `setup_terminal` | Instala ferramentas de terminal e configura o shell rc |
| `check_vscode` | Detecta VSCode, versão, extensões e fontes instaladas |
| `setup_vscode` | Instala extensões, fonte e gera settings.json |

---

## Exemplo de projeto gerado

Express + TypeScript + PostgreSQL + Docker:

```text
meu-projeto/
├── src/
│   └── index.ts
├── tsconfig.json       # strict mode + target configurados
├── package.json        # express, pg, typescript, ts-node, @types/*
├── .env                # DATABASE_URL, PORT, NODE_ENV
├── .gitignore
├── Dockerfile
├── docker-compose.yml  # banco configurado e pronto
└── README.md
```

---

## Segurança

- `run_command` aceita apenas programas da lista de permissões: `npm`, `yarn`, `pnpm`, `node`, `sh`, `bash`, `npx`
- `create_project` valida o nome do projeto contra caracteres inválidos e path traversal
- CSP configurada no Tauri para prevenir XSS
- PATH resolvido dinamicamente — nunca exposto ao usuário final

---

## Roadmap

- [x] Streaming de logs via eventos Tauri (em vez de buffer único)
- [x] Persistência do wizard entre sessões
- [x] Dashboard de projetos criados
- [x] Temas (light mode)
- [x] Internacionalização (en / pt-br)
- [x] Verificação de pré-requisitos do Docker por OS antes de instalar
- [x] Instalação/atualização automática do WSL 2 no Windows
- [x] Detecção de OrbStack além do Docker Desktop
- [x] Pós-instalação do Docker no Linux (daemon, grupo docker)
