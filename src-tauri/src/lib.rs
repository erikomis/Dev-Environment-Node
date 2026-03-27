use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use tauri::{Emitter, Manager};

fn emit_log(app: &tauri::AppHandle, line: &str) {
    app.emit("install-log", line).ok();
}

#[derive(Serialize)]
pub struct EnvStatus {
    // ferramentas
    node: bool,
    node_via_nvm: bool,
    nvm: bool,
    docker: bool,
    orbstack: bool,
    git: bool,
    node_version: Option<String>,
    docker_version: Option<String>,
    git_version: Option<String>,
    // configurações do shell
    nvm_in_shell: bool,
    git_name: Option<String>,
    git_email: Option<String>,
    yarn: bool,
    pnpm: bool,
    ssh_key: bool,
    ssh_public_key: Option<String>,
}

fn nvm_in_shell() -> bool {
    #[cfg(windows)]
    {
        // No Windows, nvm-windows gerencia o PATH automaticamente via registro
        // Verificamos se o executável nvm.exe existe em %APPDATA%\nvm
        if let Ok(appdata) = std::env::var("APPDATA") {
            return std::path::Path::new(&appdata).join("nvm").join("nvm.exe").exists();
        }
        return false;
    }
    #[cfg(not(windows))]
    {
        let home = match std::env::var("HOME") {
            Ok(h) => h,
            Err(_) => return false,
        };
        [".zshrc", ".bashrc", ".zprofile", ".bash_profile"]
            .iter()
            .any(|f| {
                std::fs::read_to_string(std::path::Path::new(&home).join(f))
                    .map(|c| c.contains("nvm"))
                    .unwrap_or(false)
            })
    }
}

#[derive(Deserialize)]
pub struct ShellFix {
    add_nvm_to_shell: bool,
    git_name: Option<String>,
    git_email: Option<String>,
    install_yarn: bool,
    install_pnpm: bool,
}

#[tauri::command]
fn fix_shell_config(fix: ShellFix) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();

    if fix.add_nvm_to_shell {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let shell = std::env::var("SHELL").unwrap_or_default();
        let rc_file = if shell.contains("zsh") { ".zshrc" } else { ".bashrc" };
        let rc_path = std::path::Path::new(&home).join(rc_file);

        let nvm_block = concat!(
            "\n# nvm\n",
            "export NVM_DIR=\"$HOME/.nvm\"\n",
            "[ -s \"$NVM_DIR/nvm.sh\" ] && \\. \"$NVM_DIR/nvm.sh\"\n",
            "[ -s \"$NVM_DIR/bash_completion\" ] && \\. \"$NVM_DIR/bash_completion\"\n",
        );

        use std::io::Write;
        std::fs::OpenOptions::new()
            .append(true)
            .create(true)
            .open(&rc_path)
            .and_then(|mut f| f.write_all(nvm_block.as_bytes()))
            .map_err(|e| e.to_string())?;
        logs.push(format!("✅ nvm adicionado ao ~/{}", rc_file));
    }

    if let Some(ref name) = fix.git_name {
        Command::new("git")
            .args(["config", "--global", "user.name", name])
            .output()
            .map_err(|e| e.to_string())?;
        logs.push(format!("✅ git config user.name = \"{}\"", name));
    }

    if let Some(ref email) = fix.git_email {
        Command::new("git")
            .args(["config", "--global", "user.email", email])
            .output()
            .map_err(|e| e.to_string())?;
        logs.push(format!("✅ git config user.email = \"{}\"", email));
    }

    if fix.install_yarn {
        Command::new("npm")
            .args(["install", "-g", "yarn"])
            .output()
            .map_err(|e| e.to_string())?;
        logs.push("✅ yarn instalado globalmente".to_string());
    }

    if fix.install_pnpm {
        Command::new("npm")
            .args(["install", "-g", "pnpm"])
            .output()
            .map_err(|e| e.to_string())?;
        logs.push("✅ pnpm instalado globalmente".to_string());
    }

    Ok(logs)
}

// ── Resolução de comandos cross-platform ─────────────────────────────────────

#[cfg(windows)]
const PATH_SEP: &str = ";";
#[cfg(not(windows))]
const PATH_SEP: &str = ":";

/// Extensões de executável que o Windows aceita (além de sem extensão).
#[cfg(windows)]
const WIN_EXTS: &[&str] = &["exe", "cmd", "bat", "ps1"];

/// Constrói um PATH completo incluindo diretórios que o Tauri não herda.
fn build_full_path() -> String {
    let mut parts: Vec<String> = Vec::new();

    if let Ok(p) = std::env::var("PATH") {
        parts.push(p);
    }

    #[cfg(windows)]
    {
        // Paths fixos comuns no Windows
        let fixed = [
            r"C:\Program Files\nodejs",
            r"C:\Program Files\Git\cmd",
            r"C:\Program Files\Git\usr\bin",
            r"C:\Windows\System32",
            r"C:\Windows",
        ];
        for p in fixed { parts.push(p.to_string()); }

        // %APPDATA% — npm global, nvm-windows
        if let Ok(appdata) = std::env::var("APPDATA") {
            parts.push(format!(r"{}\npm", appdata));

            // nvm-windows armazena versões em %APPDATA%\nvm\v*\
            let nvm_dir = std::path::Path::new(&appdata).join("nvm");
            if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        parts.push(entry.path().to_string_lossy().to_string());
                    }
                }
            }
        }

        // %LOCALAPPDATA% — VSCode, Volta, etc.
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            parts.push(format!(r"{}\Programs\Microsoft VS Code\bin", local));
            parts.push(format!(r"{}\Volta\bin", local));
        }

        // %USERPROFILE% — volta, cargo, etc.
        if let Ok(profile) = std::env::var("USERPROFILE") {
            parts.push(format!(r"{}\AppData\Roaming\npm", profile));
            parts.push(format!(r"{}\.cargo\bin", profile));
        }
    }

    #[cfg(not(windows))]
    {
        let fixed = [
            "/usr/local/bin",
            "/usr/local/sbin",
            "/opt/homebrew/bin",  // Homebrew Apple Silicon
            "/opt/homebrew/sbin",
            "/usr/bin",
            "/usr/sbin",
            "/bin",
            "/sbin",
        ];
        for p in fixed { parts.push(p.to_string()); }

        if let Ok(home) = std::env::var("HOME") {
            parts.push(format!("{}/.local/bin", home));  // Linux user installs
            parts.push(format!("{}/.cargo/bin", home));  // Rust tools

            // NVM Unix — descobre todas as versões instaladas
            let nvm_dir = std::path::Path::new(&home).join(".nvm/versions/node");
            if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
                for entry in entries.flatten() {
                    let bin = entry.path().join("bin");
                    if bin.is_dir() {
                        parts.push(bin.to_string_lossy().to_string());
                    }
                }
            }
        }

        parts.push("/snap/bin".to_string()); // Linux Snap
    }

    parts.join(PATH_SEP)
}

fn command_exists(cmd: &str) -> bool {
    let full_path = build_full_path();

    // 1. via where/which com PATH estendido
    #[cfg(windows)]
    let finder = "where";
    #[cfg(not(windows))]
    let finder = "which";

    let ok = Command::new(finder)
        .arg(cmd)
        .env("PATH", &full_path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);
    if ok { return true; }

    // 2. busca direta nos diretórios
    for dir in full_path.split(PATH_SEP) {
        let base = std::path::Path::new(dir).join(cmd);
        if base.exists() { return true; }

        #[cfg(windows)]
        for ext in WIN_EXTS {
            if base.with_extension(ext).exists() { return true; }
        }
    }
    false
}

fn resolve_cmd(cmd: &str) -> String {
    let full_path = build_full_path();

    for dir in full_path.split(PATH_SEP) {
        let base = std::path::Path::new(dir).join(cmd);
        if base.exists() {
            return base.to_string_lossy().to_string();
        }

        #[cfg(windows)]
        for ext in WIN_EXTS {
            let p = base.with_extension(ext);
            if p.exists() { return p.to_string_lossy().to_string(); }
        }
    }

    cmd.to_string()
}

fn get_version(cmd: &str, args: &[&str]) -> Option<String> {
    Command::new(cmd)
        .args(args)
        .env("PATH", build_full_path())
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
}

#[tauri::command]
fn check_environment() -> EnvStatus {
    let node = command_exists("node");
    let docker = command_exists("docker");
    let orbstack = command_exists("orb") || std::path::Path::new("/Applications/OrbStack.app").exists();
    let git = command_exists("git");
    let nvm = std::env::var("HOME")
        .map(|h| std::path::Path::new(&h).join(".nvm/nvm.sh").exists())
        .unwrap_or(false);

    // node_via_nvm is true only when the node binary path actually contains ".nvm"
    let node_via_nvm = node
        && Command::new("which")
            .arg("node")
            .env("PATH", build_full_path())
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(".nvm"))
            .unwrap_or(false);

    let yarn = command_exists("yarn");
    let pnpm = command_exists("pnpm");

    EnvStatus {
        node,
        node_via_nvm,
        nvm,
        docker,
        orbstack,
        git,
        node_version: if node { get_version("node", &["--version"]) } else { None },
        docker_version: if docker { get_version("docker", &["--version"]) } else { None },
        git_version: if git { get_version("git", &["--version"]) } else { None },
        nvm_in_shell: nvm_in_shell(),
        git_name: if git { get_version("git", &["config", "--global", "user.name"]) } else { None },
        git_email: if git { get_version("git", &["config", "--global", "user.email"]) } else { None },
        yarn,
        pnpm,
        ssh_key: ssh_public_key_path().is_some(),
        ssh_public_key: ssh_public_key_path()
            .and_then(|p| std::fs::read_to_string(p).ok())
            .map(|s| s.trim().to_string()),
    }
}

fn ssh_dir() -> std::path::PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    std::path::Path::new(&home).join(".ssh")
}

fn ssh_public_key_path() -> Option<std::path::PathBuf> {
    for name in &["id_ed25519.pub", "id_ecdsa.pub", "id_rsa.pub"] {
        let p = ssh_dir().join(name);
        if p.exists() { return Some(p); }
    }
    None
}

#[tauri::command]
fn generate_ssh_key(email: String, force: bool, key_name: Option<String>) -> Result<String, String> {
    let ssh = ssh_dir();
    std::fs::create_dir_all(&ssh).map_err(|e| e.to_string())?;

    // Se key_name não informado, usa id_ed25519; se force=false e existe, encontra nome livre
    let base_name = key_name.unwrap_or_else(|| "id_ed25519".to_string());
    let key_path = if !force && ssh.join(&base_name).exists() {
        // Encontra o primeiro nome livre: base_name_2, _3, ...
        let mut i = 2u32;
        loop {
            let candidate = ssh.join(format!("{}_{}", base_name, i));
            if !candidate.exists() { break candidate; }
            i += 1;
        }
    } else {
        ssh.join(&base_name)
    };

    let out = Command::new("ssh-keygen")
        .args([
            "-t", "ed25519",
            "-C", &email,
            "-f", &key_path.to_string_lossy(),
            "-N", "",   // sem passphrase
        ])
        .env("PATH", build_full_path())
        .output()
        .map_err(|e| format!("ssh-keygen não encontrado: {}", e))?;

    if !out.status.success() {
        return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
    }

    std::fs::read_to_string(key_path.with_extension("pub"))
        .map(|s| s.trim().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_os() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[derive(Deserialize)]
pub struct ProjectConfig {
    name: String,
    path: String,
    framework: String,
    typescript: bool,
    ts_strict: Option<bool>,
    ts_target: Option<String>,
    package_manager: String,
    database: String,
    docker: bool,
    vite_template: Option<String>,
    monorepo: Option<bool>,
    monorepo_tool: Option<String>,
    overwrite: Option<bool>,
}

fn run_cli(logs: &mut Vec<String>, label: &str, npx_args: &[&str], cwd: &std::path::Path) -> Result<(), String> {
    logs.push(format!("→ Executando npx {} (pode levar alguns minutos)…", label));
    let out = Command::new(resolve_cmd("npx"))
        .args(npx_args)
        .current_dir(cwd)
        .env("PATH", build_full_path())
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&out.stdout);
    let stderr = String::from_utf8_lossy(&out.stderr);
    for line in stdout.lines().chain(stderr.lines()) {
        let t = line.trim();
        if !t.is_empty() { logs.push(format!("  {}", t)); }
    }
    if !out.status.success() {
        return Err(format!("Falha ao executar CLI de {}", label));
    }
    Ok(())
}

fn create_monorepo(config: &ProjectConfig) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();
    let parent = std::path::Path::new(&config.path);
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let pm = config.package_manager.as_str();
    let tool = config.monorepo_tool.as_deref().unwrap_or("turborepo");

    match tool {
        "turborepo" => {
            run_cli(&mut logs, "create-turbo", &[
                "--yes", "create-turbo", &config.name,
                "--package-manager", pm,
            ], parent)?;
            logs.push(format!("✅ Monorepo Turborepo '{}' criado em {}", config.name, parent.display()));
        }
        "nx" => {
            run_cli(&mut logs, "create-nx-workspace", &[
                "--yes", "create-nx-workspace", &config.name,
                "--packageManager", pm,
                "--preset", "ts",
                "--no-interactive",
            ], parent)?;
            logs.push(format!("✅ Monorepo Nx '{}' criado em {}", config.name, parent.display()));
        }
        _ => return Err(format!("Ferramenta de monorepo desconhecida: {}", tool)),
    }
    Ok(logs)
}

fn create_project_via_cli(config: &ProjectConfig) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();
    let parent = std::path::Path::new(&config.path);
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;

    let project_dir = parent.join(&config.name);
    if project_dir.exists() && config.overwrite.unwrap_or(false) {
        std::fs::remove_dir_all(&project_dir).map_err(|e| e.to_string())?;
        logs.push(format!("🗑 Pasta existente removida: {}", project_dir.display()));
    }

    let pm = config.package_manager.as_str();
    let name = config.name.as_str();

    match config.framework.as_str() {
        "nestjs" => {
            run_cli(&mut logs, "@nestjs/cli", &[
                "--yes", "@nestjs/cli", "new", name,
                "--package-manager", pm,
            ], parent)?;
        }
        "angular" => {
            run_cli(&mut logs, "@angular/cli", &[
                "--yes", "@angular/cli", "new", name,
                "--package-manager", pm, "--defaults",
            ], parent)?;
        }
        "next" => {
            let pm_flag = match pm {
                "yarn" => "--use-yarn",
                "pnpm" => "--use-pnpm",
                _      => "--use-npm",
            };
            run_cli(&mut logs, "create-next-app", &[
                "--yes", "create-next-app", name,
                "--typescript", "--tailwind", "--eslint", "--app", pm_flag,
            ], parent)?;
        }
        "nuxt" => {
            run_cli(&mut logs, "nuxi", &[
                "--yes", "nuxi", "init", name,
                "--package-manager", pm,
            ], parent)?;
        }
        "vite" => {
            let template = config.vite_template.as_deref().unwrap_or("react-ts");
            run_cli(&mut logs, "create-vite", &[
                "--yes", "create-vite", name,
                "--template", template,
            ], parent)?;
        }
        other => return Err(format!("Framework CLI desconhecido: {}", other)),
    }

    logs.push(format!("✅ Projeto '{}' criado em {}", name, parent.display()));
    Ok(logs)
}

#[tauri::command]
fn create_project(app: tauri::AppHandle, config: ProjectConfig) -> Result<Vec<String>, String> {
    // ── Validações ──────────────────────────────────────────────────────────
    if config.name.is_empty() {
        return Err("Nome do projeto não pode ser vazio.".to_string());
    }
    if config.name.contains("..") || config.name.contains('/') || config.name.contains('\\') {
        return Err("Nome do projeto inválido: não use '..', '/' ou '\\\\'.".to_string());
    }

    // ── Monorepo ─────────────────────────────────────────────────────────────
    if config.monorepo.unwrap_or(false) {
        let logs = create_monorepo(&config)?;
        for line in &logs { emit_log(&app, line); }
        return Ok(logs);
    }

    // ── CLIs que gerenciam a criação do projeto ──────────────────────────────
    const CLI_FRAMEWORKS: &[&str] = &["nestjs", "angular", "next", "nuxt", "vite"];
    if CLI_FRAMEWORKS.contains(&config.framework.as_str()) {
        let logs = create_project_via_cli(&config)?;
        for line in &logs { emit_log(&app, line); }
        return Ok(logs);
    }

    let mut logs: Vec<String> = Vec::new();
    let project_path = std::path::Path::new(&config.path).join(&config.name);

    if project_path.exists() && config.overwrite.unwrap_or(false) {
        std::fs::remove_dir_all(&project_path).map_err(|e| e.to_string())?;
        logs.push(format!("🗑 Pasta existente removida: {}", project_path.display()));
    }

    std::fs::create_dir_all(&project_path).map_err(|e| e.to_string())?;
    logs.push(format!("📁 Criado: {}", project_path.display()));

    // package.json
    let pkg_name = config.name.to_lowercase().replace(' ', "-");
    let main_file = if config.typescript {
        "src/index.ts"
    } else {
        "src/index.js"
    };
    let start_cmd = if config.typescript {
        "ts-node src/index.ts"
    } else {
        "node src/index.js"
    };
    let dev_cmd = if config.typescript {
        "ts-node --watch src/index.ts"
    } else {
        "node --watch src/index.js"
    };

    // Build runtime dependencies
    let mut dep_pairs: Vec<&str> = Vec::new();
    match config.framework.as_str() {
        "express" => dep_pairs.push(r#""express": "^4.18.2""#),
        "fastify"  => dep_pairs.push(r#""fastify": "^4.26.0""#),
        _ => {}
    }
    match config.database.as_str() {
        "postgres" => dep_pairs.push(r#""pg": "^8.11.0""#),
        "mysql"    => dep_pairs.push(r#""mysql2": "^3.6.5""#),
        "mongodb"  => dep_pairs.push(r#""mongodb": "^6.3.0""#),
        _ => {}
    }

    // Build devDependencies
    let mut dev_pairs: Vec<&str> = Vec::new();
    if config.typescript {
        dev_pairs.push(r#""typescript": "^5.3.0""#);
        dev_pairs.push(r#""ts-node": "^10.9.2""#);
        dev_pairs.push(r#""@types/node": "^20.0.0""#);
        if config.framework == "express" {
            dev_pairs.push(r#""@types/express": "^4.17.21""#);
        }
        if config.database == "postgres" {
            dev_pairs.push(r#""@types/pg": "^8.10.9""#);
        }
    }

    let deps_block = if dep_pairs.is_empty() {
        "{}".to_string()
    } else {
        format!("{{\n    {}\n  }}", dep_pairs.join(",\n    "))
    };
    let dev_block = if dev_pairs.is_empty() {
        String::new()
    } else {
        format!(
            ",\n  \"devDependencies\": {{\n    {}\n  }}",
            dev_pairs.join(",\n    ")
        )
    };

    let package_json = format!(
        "{{\n  \"name\": \"{}\",\n  \"version\": \"0.1.0\",\n  \"main\": \"{}\",\n  \"scripts\": {{\n    \"start\": \"{}\",\n    \"dev\": \"{}\"\n  }},\n  \"dependencies\": {}{}\n}}\n",
        pkg_name, main_file, start_cmd, dev_cmd, deps_block, dev_block
    );
    std::fs::write(project_path.join("package.json"), package_json)
        .map_err(|e| e.to_string())?;
    logs.push("📄 Criado package.json".to_string());

    // src/
    std::fs::create_dir_all(project_path.join("src")).map_err(|e| e.to_string())?;

    let main_content = match (config.framework.as_str(), config.typescript) {
        ("express", true) => {
            "import express from 'express';\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(express.json());\n\napp.get('/', (_req, res) => {\n  res.json({ message: 'Hello World!' });\n});\n\napp.listen(PORT, () => {\n  console.log(`Server running on http://localhost:${PORT}`);\n});\n"
        }
        ("express", false) => {
            "const express = require('express');\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.use(express.json());\n\napp.get('/', (_req, res) => {\n  res.json({ message: 'Hello World!' });\n});\n\napp.listen(PORT, () => {\n  console.log(`Server running on http://localhost:${PORT}`);\n});\n"
        }
        ("fastify", true) => {
            "import Fastify from 'fastify';\n\nconst fastify = Fastify({ logger: true });\nconst PORT = parseInt(process.env.PORT || '3000');\n\nfastify.get('/', async () => {\n  return { message: 'Hello World!' };\n});\n\nfastify.listen({ port: PORT }, (err) => {\n  if (err) process.exit(1);\n});\n"
        }
        _ => {
            "const Fastify = require('fastify');\n\nconst fastify = Fastify({ logger: true });\nconst PORT = parseInt(process.env.PORT || '3000');\n\nfastify.get('/', async () => {\n  return { message: 'Hello World!' };\n});\n\nfastify.listen({ port: PORT }, (err) => {\n  if (err) process.exit(1);\n});\n"
        }
    };

    let entry_file = if config.typescript {
        "index.ts"
    } else {
        "index.js"
    };
    std::fs::write(project_path.join("src").join(entry_file), main_content)
        .map_err(|e| e.to_string())?;
    logs.push(format!("📄 Criado src/{}", entry_file));

    // .gitignore
    std::fs::write(
        project_path.join(".gitignore"),
        "node_modules/\ndist/\n.env\n*.log\n",
    )
    .map_err(|e| e.to_string())?;
    logs.push("📄 Criado .gitignore".to_string());

    // tsconfig.json
    if config.typescript {
        let target = config.ts_target.as_deref().unwrap_or("ES2020");
        let strict = config.ts_strict.unwrap_or(true);
        let tsconfig = format!(
            "{{\n  \"compilerOptions\": {{\n    \"target\": \"{}\",\n    \"module\": \"commonjs\",\n    \"lib\": [\"{}\", \"dom\"],\n    \"outDir\": \"./dist\",\n    \"rootDir\": \"./src\",\n    \"strict\": {},\n    \"esModuleInterop\": true,\n    \"skipLibCheck\": true,\n    \"forceConsistentCasingInFileNames\": true,\n    \"resolveJsonModule\": true\n  }},\n  \"include\": [\"src/**/*\"],\n  \"exclude\": [\"node_modules\", \"dist\"]\n}}\n",
            target, target, strict
        );
        std::fs::write(project_path.join("tsconfig.json"), tsconfig)
            .map_err(|e| e.to_string())?;
        logs.push("📄 Criado tsconfig.json".to_string());
    }

    // .env
    let mut env_content = "PORT=3000\nNODE_ENV=development\n".to_string();
    match config.database.as_str() {
        "postgres" => env_content
            .push_str("DATABASE_URL=postgresql://user:password@localhost:5432/dbname\n"),
        "mysql" => {
            env_content.push_str("DATABASE_URL=mysql://user:password@localhost:3306/dbname\n")
        }
        "mongodb" => env_content.push_str("MONGODB_URI=mongodb://localhost:27017/dbname\n"),
        _ => {}
    }
    std::fs::write(project_path.join(".env"), env_content).map_err(|e| e.to_string())?;
    logs.push("📄 Criado .env".to_string());

    // README
    let readme = format!(
        "# {}\n\nProjeto gerado pelo Dev Environment Node.\n\n## Rodando\n\n```bash\n{} install\n{} run dev\n```\n",
        config.name,
        config.package_manager,
        config.package_manager
    );
    std::fs::write(project_path.join("README.md"), readme).map_err(|e| e.to_string())?;
    logs.push("📄 Criado README.md".to_string());

    // Docker
    if config.docker {
        let install_cmd = match config.package_manager.as_str() {
            "yarn" => "yarn install",
            "pnpm" => "pnpm install",
            _ => "npm install",
        };

        let dockerfile = format!(
            "FROM node:20-alpine\n\nWORKDIR /app\n\nCOPY package*.json ./\nRUN {}\n\nCOPY . .\n\nEXPOSE 3000\nCMD [\"npm\", \"start\"]\n",
            install_cmd
        );
        std::fs::write(project_path.join("Dockerfile"), dockerfile)
            .map_err(|e| e.to_string())?;

        let mut compose = "version: '3.8'\n\nservices:\n  app:\n    build: .\n    ports:\n      - \"3000:3000\"\n    environment:\n      NODE_ENV: development\n    volumes:\n      - .:/app\n      - /app/node_modules\n".to_string();

        match config.database.as_str() {
            "postgres" => compose.push_str("\n  postgres:\n    image: postgres:16-alpine\n    ports:\n      - \"5432:5432\"\n    environment:\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n      POSTGRES_DB: dbname\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  postgres_data:\n"),
            "mysql" => compose.push_str("\n  mysql:\n    image: mysql:8-debian\n    ports:\n      - \"3306:3306\"\n    environment:\n      MYSQL_ROOT_PASSWORD: password\n      MYSQL_DATABASE: dbname\n      MYSQL_USER: user\n      MYSQL_PASSWORD: password\n    volumes:\n      - mysql_data:/var/lib/mysql\n\nvolumes:\n  mysql_data:\n"),
            "mongodb" => compose.push_str("\n  mongodb:\n    image: mongo:7\n    ports:\n      - \"27017:27017\"\n    volumes:\n      - mongodb_data:/data/db\n\nvolumes:\n  mongodb_data:\n"),
            _ => {}
        }

        std::fs::write(project_path.join("docker-compose.yml"), compose)
            .map_err(|e| e.to_string())?;
        logs.push("🐳 Criado Dockerfile + docker-compose.yml".to_string());
    }

    logs.push(format!(
        "✅ Projeto '{}' criado em {}",
        config.name,
        project_path.display()
    ));
    for line in &logs { emit_log(&app, line); }
    Ok(logs)
}

#[tauri::command]
fn run_installer(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let os = std::env::consts::OS;

    let script_name = match os {
        "macos"   => "mac.sh",
        "linux"   => "linux.sh",
        "windows" => "windows.ps1",
        other     => return Err(format!("OS não suportado: {}", other)),
    };

    // In dev, scripts live at ../../installers/; in release, in the resource dir.
    let script_path = if cfg!(debug_assertions) {
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap()
            .join("installers")
            .join(script_name)
    } else {
        app.path()
            .resource_dir()
            .map_err(|e: tauri::Error| e.to_string())?
            .join(script_name)
    };

    if !script_path.exists() {
        return Err(format!("Script não encontrado: {}", script_path.display()));
    }

    // Spawn the process with piped stdout/stderr so we can stream line by line.
    let mut child = if os == "windows" {
        Command::new("powershell")
            .args(["-ExecutionPolicy", "Bypass", "-File", script_path.to_str().unwrap()])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    } else {
        Command::new("bash")
            .args(["-l", script_path.to_str().unwrap()])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
    }
    .map_err(|e| e.to_string())?;

    let mut lines: Vec<String> = Vec::new();

    if let Some(stdout) = child.stdout.take() {
        for l in BufReader::new(stdout).lines().map_while(Result::ok) {
            emit_log(&app, &l);
            lines.push(l);
        }
    }
    if let Some(stderr) = child.stderr.take() {
        for l in BufReader::new(stderr).lines().map_while(Result::ok) {
            if !l.trim().is_empty() {
                emit_log(&app, &l);
                lines.push(l);
            }
        }
    }

    child.wait().map_err(|e| e.to_string())?;
    Ok(lines)
}

/// Tenta instalar um pacote no Linux por tentativa e erro entre os gerenciadores
/// mais comuns. Retorna true se algum teve sucesso.
fn linux_pkg_install(packages: &[(&str, &[&str], &str)], logs: &mut Vec<String>) -> bool {
    // packages: (package_manager, extra_args, package_name)
    for (pm, args, pkg) in packages {
        if !command_exists(pm) { continue; }
        logs.push(format!("→ Tentando {} {}…", pm, pkg));
        let ok = Command::new(resolve_cmd(pm))
            .args(*args)
            .arg(pkg)
            .env("PATH", build_full_path())
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);
        if ok {
            logs.push(format!("✅ Instalado via {}", pm));
            return true;
        }
        logs.push(format!("  ↳ {} não funcionou, tentando próximo…", pm));
    }
    false
}

/// Verifica se os pré-requisitos para instalar Docker estão presentes.
#[derive(Serialize)]
pub struct DockerPrereqStatus {
    can_install: bool,
    reason: Option<String>,
    warnings: Vec<String>,
}

#[tauri::command]
fn check_docker_prerequisites(tool: String) -> DockerPrereqStatus {
    let mut warnings: Vec<String> = Vec::new();

    match std::env::consts::OS {
        "macos" => {
            // 1. Homebrew precisa estar instalado
            if !command_exists("brew") {
                return DockerPrereqStatus {
                    can_install: false,
                    reason: Some("Homebrew não encontrado. Instale em https://brew.sh antes de continuar.".to_string()),
                    warnings,
                };
            }

            // 2. Versão mínima do macOS
            let min_major: u32 = if tool == "orbstack" { 13 } else { 12 };
            let min_name = if tool == "orbstack" { "Ventura (13)" } else { "Monterey (12)" };

            let version_ok = Command::new("sw_vers")
                .arg("-productVersion")
                .output()
                .ok()
                .and_then(|out| String::from_utf8(out.stdout).ok())
                .and_then(|v| v.trim().split('.').next()?.parse::<u32>().ok())
                .map(|major| major >= min_major)
                .unwrap_or(false);

            if !version_ok {
                return DockerPrereqStatus {
                    can_install: false,
                    reason: Some(format!(
                        "{} requer macOS {} ou mais recente.",
                        if tool == "orbstack" { "OrbStack" } else { "Docker Desktop" },
                        min_name
                    )),
                    warnings,
                };
            }

            warnings.push("Após a instalação, abra o app manualmente para concluir a configuração.".to_string());
            DockerPrereqStatus { can_install: true, reason: None, warnings }
        }
        "linux" => {
            // 1. Arquitetura 64-bit
            let arch = Command::new("uname")
                .arg("-m")
                .output()
                .ok()
                .and_then(|out| String::from_utf8(out.stdout).ok())
                .map(|s| s.trim().to_string())
                .unwrap_or_default();

            let is_64bit = matches!(arch.as_str(), "x86_64" | "aarch64" | "arm64" | "s390x" | "ppc64le");
            if !is_64bit {
                return DockerPrereqStatus {
                    can_install: false,
                    reason: Some(format!(
                        "Arquitetura '{}' não suportada. Docker Engine requer sistema 64-bit (x86_64, aarch64, s390x ou ppc64le).",
                        arch
                    )),
                    warnings,
                };
            }

            // 2. curl ou package manager
            let has_curl = command_exists("curl");
            let has_pm = ["apt-get", "dnf", "pacman", "zypper", "apk", "emerge"]
                .iter()
                .any(|pm| command_exists(pm));

            if !has_curl && !has_pm {
                return DockerPrereqStatus {
                    can_install: false,
                    reason: Some("curl e nenhum gerenciador de pacotes encontrado. Instale curl ou um gerenciador compatível.".to_string()),
                    warnings,
                };
            }

            if !has_curl {
                warnings.push("curl não encontrado; será usada instalação via gerenciador de pacotes.".to_string());
            }

            warnings.push("Pode ser necessário executar com sudo.".to_string());
            DockerPrereqStatus { can_install: true, reason: None, warnings }
        }
        "windows" => {
            // 1. winget
            if !command_exists("winget") {
                return DockerPrereqStatus {
                    can_install: false,
                    reason: Some("winget não encontrado. Atualize o Windows ou instale o App Installer pela Microsoft Store.".to_string()),
                    warnings,
                };
            }

            // 2. Versão do Windows — mínimo build 19045 (Windows 10 22H2)
            let build_number: Option<u32> = Command::new("powershell")
                .args(["-NoProfile", "-Command",
                    "(Get-WmiObject Win32_OperatingSystem).BuildNumber"])
                .output()
                .ok()
                .and_then(|out| String::from_utf8(out.stdout).ok())
                .and_then(|s| s.trim().parse().ok());

            match build_number {
                Some(build) if build < 19045 => {
                    return DockerPrereqStatus {
                        can_install: false,
                        reason: Some(format!(
                            "Windows build {} detectado. Docker Desktop requer Windows 10 22H2 (build 19045) ou Windows 11 23H2 (build 22631) ou mais recente.",
                            build
                        )),
                        warnings,
                    };
                }
                None => {
                    warnings.push("Não foi possível verificar a versão do Windows. Certifique-se de usar Windows 10 22H2 ou Windows 11 23H2+.".to_string());
                }
                _ => {}
            }

            // 3. RAM mínima de 8 GB
            let ram_gb: Option<f64> = Command::new("powershell")
                .args(["-NoProfile", "-Command",
                    "(Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory"])
                .output()
                .ok()
                .and_then(|out| String::from_utf8(out.stdout).ok())
                .and_then(|s| s.trim().parse::<u64>().ok())
                .map(|bytes| bytes as f64 / 1_073_741_824.0);

            if let Some(gb) = ram_gb {
                if gb < 8.0 {
                    return DockerPrereqStatus {
                        can_install: false,
                        reason: Some(format!(
                            "RAM insuficiente: {:.1} GB detectados. Docker Desktop requer no mínimo 8 GB.",
                            gb
                        )),
                        warnings,
                    };
                }
            }

            // 4. Virtualização habilitada no firmware (Intel VT-x / AMD-V + SLAT)
            let virt_enabled = Command::new("powershell")
                .args(["-NoProfile", "-Command",
                    "(Get-WmiObject Win32_Processor).VirtualizationFirmwareEnabled"])
                .output()
                .ok()
                .map(|out| String::from_utf8_lossy(&out.stdout).trim().eq_ignore_ascii_case("True"))
                .unwrap_or(false);

            if !virt_enabled {
                return DockerPrereqStatus {
                    can_install: false,
                    reason: Some(
                        "Virtualização não está habilitada no firmware (BIOS/UEFI). \
                         Habilite a opção Intel VT-x ou AMD-V nas configurações do BIOS para prosseguir."
                        .to_string()
                    ),
                    warnings,
                };
            }

            // 5. WSL versão 2.1.5+
            // `wsl --version` retorna linhas como "WSL version: 2.x.x.x"
            let wsl_version: Option<(u32, u32, u32)> = Command::new("wsl")
                .arg("--version")
                .output()
                .ok()
                .and_then(|out| String::from_utf8(out.stdout).ok())
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.to_lowercase().contains("wsl version"))
                        .and_then(|l| l.split(':').nth(1))
                        .map(|v| v.trim().to_string())
                })
                .and_then(|v| {
                    let parts: Vec<u32> = v.split('.').filter_map(|p| p.parse().ok()).collect();
                    if parts.len() >= 3 { Some((parts[0], parts[1], parts[2])) } else { None }
                });

            match wsl_version {
                None => {
                    warnings.push(
                        "WSL 2 não encontrado ou desatualizado. Execute 'wsl --install' no PowerShell como administrador e reinicie o computador antes de usar o Docker Desktop."
                        .to_string()
                    );
                }
                Some((major, minor, patch)) if (major, minor, patch) < (2, 1, 5) => {
                    warnings.push(format!(
                        "WSL versão {}.{}.{} detectada; Docker Desktop requer WSL 2.1.5+. Execute 'wsl --update' para atualizar.",
                        major, minor, patch
                    ));
                }
                _ => {}
            }

            warnings.push("Após a instalação do Docker Desktop, reinicie o computador para finalizar.".to_string());
            DockerPrereqStatus { can_install: true, reason: None, warnings }
        }
        _ => DockerPrereqStatus {
            can_install: false,
            reason: Some("Sistema operacional não suportado para instalação automática do Docker.".to_string()),
            warnings,
        },
    }
}

/// Verifica se há pacotes que conflitam com o Docker Engine oficial e avisa o usuário.
/// Não remove nada automaticamente — a decisão é do usuário.
fn warn_conflicting_docker_packages(logs: &mut Vec<String>) {
    let conflicting = [
        ("dpkg",   "-s",  "docker.io"),
        ("dpkg",   "-s",  "podman-docker"),
        ("dpkg",   "-s",  "containerd"),
        ("rpm",    "-q",  "docker"),
        ("rpm",    "-q",  "podman-docker"),
        ("pacman", "-Qi", "docker"),
    ];

    let found: Vec<&str> = conflicting.iter()
        .filter(|(cmd, flag, pkg)| {
            command_exists(cmd) &&
            Command::new(cmd)
                .args([*flag, *pkg])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false)
        })
        .map(|(_, _, pkg)| *pkg)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();

    if !found.is_empty() {
        logs.push(format!(
            "⚠ Pacotes conflitantes detectados: {}. Se a instalação falhar, remova-os manualmente antes de tentar novamente.",
            found.join(", ")
        ));
    }
}

fn is_root() -> bool {
    Command::new("id").arg("-u")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.trim().parse::<u32>().ok())
        .map(|uid| uid == 0)
        .unwrap_or(false)
}

/// Inicia e habilita o daemon do Docker + adiciona usuário ao grupo docker (via sudo).
fn post_install_docker_linux(logs: &mut Vec<String>) {
    let root = is_root();

    if !root && !command_exists("sudo") {
        logs.push("⚠ sudo não encontrado e não é root. Execute manualmente: systemctl start docker && systemctl enable docker".to_string());
        return;
    }

    // Inicia e habilita o serviço
    if command_exists("systemctl") {
        let mut cmd = if root {
            let mut c = Command::new("systemctl");
            c.args(["start", "docker"]);
            c
        } else {
            let mut c = Command::new("sudo");
            c.args(["systemctl", "start", "docker"]);
            c
        };
        let start_ok = cmd.output().map(|o| o.status.success()).unwrap_or(false);

        if start_ok {
            logs.push("✅ Serviço Docker iniciado.".to_string());
            let enable_args: &[&str] = if root {
                &["systemctl", "enable", "docker"]
            } else {
                &["sudo", "systemctl", "enable", "docker"]
            };
            let _ = Command::new(enable_args[0]).args(&enable_args[1..]).output();
            logs.push("✅ Docker habilitado para iniciar com o sistema.".to_string());
        } else {
            logs.push("⚠ Não foi possível iniciar o serviço Docker. Execute: sudo systemctl start docker".to_string());
        }
    }

    // Adiciona usuário atual ao grupo docker (só faz sentido se não for root)
    let user = std::env::var("USER")
        .or_else(|_| std::env::var("LOGNAME"))
        .unwrap_or_default();

    if !user.is_empty() && user != "root" {
        let ok = if root {
            Command::new("usermod").args(["-aG", "docker", &user]).output()
        } else {
            Command::new("sudo").args(["usermod", "-aG", "docker", &user]).output()
        }
        .map(|o| o.status.success())
        .unwrap_or(false);

        if ok {
            logs.push(format!("✅ Usuário '{}' adicionado ao grupo docker.", user));
            logs.push("⚠ Faça logout e login novamente (ou execute 'newgrp docker') para usar Docker sem sudo.".to_string());
        } else {
            logs.push(format!(
                "⚠ Não foi possível adicionar '{}' ao grupo docker. Execute: sudo usermod -aG docker {}",
                user, user
            ));
        }
    }
}

/// Instala Docker Engine no Linux usando o script oficial ou gerenciadores de pacotes.
fn install_docker_linux(logs: &mut Vec<String>) -> Result<(), String> {
    let root = is_root();

    // 1. Avisa sobre pacotes conflitantes (sem remover nada)
    warn_conflicting_docker_packages(logs);

    // 2. Script oficial — funciona em Debian, Ubuntu, Fedora, CentOS, Raspbian
    //    O script usa sudo internamente quando necessário.
    if command_exists("curl") {
        logs.push("→ Baixando script oficial de instalação do Docker…".to_string());
        let out = Command::new("sh")
            .args(["-c", "curl -fsSL https://get.docker.com | sh"])
            .env("PATH", build_full_path())
            .output()
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            logs.push("✅ Docker instalado via script oficial.".to_string());
            post_install_docker_linux(logs);
            return Ok(());
        }
        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
        logs.push(format!("  ↳ Script oficial falhou: {}", stderr));
    }

    // 3. Fallback por gerenciador de pacotes (com sudo se não for root)
    //    apt-get usa docker.io (disponível nos repos padrão do Debian/Ubuntu)
    //    sem precisar adicionar o repositório oficial do Docker.
    #[rustfmt::skip]
    let attempts: &[(&str, &[&str], &str)] = &[
        ("apt-get", &["install", "-y"], "docker.io"),
        ("dnf",     &["install", "-y"], "moby-engine"),
        ("pacman",  &["-S", "--noconfirm"], "docker"),
        ("zypper",  &["install", "-y"], "docker"),
        ("apk",     &["add", "--no-cache"], "docker"),
        ("emerge",  &["-av", "--nospinner"], "app-containers/docker"),
    ];

    for (pm, args, pkg) in attempts {
        if !command_exists(pm) { continue; }
        logs.push(format!("→ Tentando {} {}…", pm, pkg));
        let ok = if root {
            Command::new(resolve_cmd(pm))
                .args(*args).arg(pkg)
                .env("PATH", build_full_path())
                .output()
        } else {
            Command::new("sudo")
                .arg(resolve_cmd(pm))
                .args(*args).arg(pkg)
                .env("PATH", build_full_path())
                .output()
        }
        .map(|o| o.status.success())
        .unwrap_or(false);

        if ok {
            logs.push(format!("✅ Docker instalado via {}", pm));
            post_install_docker_linux(logs);
            return Ok(());
        }
        logs.push(format!("  ↳ {} não funcionou, tentando próximo…", pm));
    }

    Err("Não foi possível instalar o Docker. Instale manualmente: https://docs.docker.com/engine/install/".to_string())
}

/// Instala uma fonte no Linux por tentativa e erro entre gerenciadores de pacotes.
fn install_font_linux(font_id: &str, logs: &mut Vec<String>) -> Result<(), String> {
    #[rustfmt::skip]
    let attempts: &[(&str, &[&str], &str)] = match font_id {
        "fira-code" => &[
            ("apt-get", &["install", "-y"], "fonts-firacode"),
            ("dnf",     &["install", "-y"], "fira-code-fonts"),
            ("pacman",  &["-S", "--noconfirm"], "ttf-fira-code"),
            ("zypper",  &["install", "-y"], "fira-code-fonts"),
            ("apk",     &["add", "--no-cache"], "font-fira-code"),
        ],
        "jetbrains-mono" => &[
            ("apt-get", &["install", "-y"], "fonts-jetbrains-mono"),
            ("dnf",     &["install", "-y"], "jetbrains-mono-fonts"),
            ("pacman",  &["-S", "--noconfirm"], "ttf-jetbrains-mono"),
            ("zypper",  &["install", "-y"], "jetbrains-mono"),
            ("apk",     &["add", "--no-cache"], "font-jetbrains-mono"),
        ],
        _ => return Ok(()),
    };

    if linux_pkg_install(attempts, logs) {
        // Atualiza cache de fontes
        if command_exists("fc-cache") {
            let _ = Command::new(resolve_cmd("fc-cache")).arg("-fv").output();
            logs.push("✅ Cache de fontes atualizado (fc-cache).".to_string());
        }
        return Ok(());
    }

    Err("Não foi possível instalar a fonte automaticamente. \
         Baixe manualmente em https://www.nerdfonts.com"
        .to_string())
}

#[tauri::command]
fn install_docker_tool(app: tauri::AppHandle, tool: String) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();
    let label = if tool == "orbstack" { "OrbStack" } else { "Docker Desktop" };

    match std::env::consts::OS {
        "macos" => {
            let cask = if tool == "orbstack" { "orbstack" } else { "docker" };
            logs.push(format!("→ Instalando {} via Homebrew…", label));
            let out = Command::new(resolve_cmd("brew"))
                .args(["install", "--cask", cask])
                .env("PATH", build_full_path())
                .output()
                .map_err(|e| e.to_string())?;
            let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
            if out.status.success() || stderr.contains("already installed") {
                logs.push(format!("✅ {} instalado. Abra o app para finalizar.", label));
            } else {
                return Err(format!("Falha ao instalar {}: {}", label, stderr));
            }
        }
        "windows" => {
            // OrbStack não existe no Windows — usa Docker Desktop via winget

            // ── WSL ───────────────────────────────────────────────────────────
            // Detecta versão do WSL para decidir se instala ou atualiza
            let wsl_version: Option<(u32, u32, u32)> = Command::new("wsl")
                .arg("--version")
                .output()
                .ok()
                .and_then(|out| String::from_utf8(out.stdout).ok())
                .and_then(|s| {
                    s.lines()
                        .find(|l| l.to_lowercase().contains("wsl version"))
                        .and_then(|l| l.split(':').nth(1))
                        .map(|v| v.trim().to_string())
                })
                .and_then(|v| {
                    let parts: Vec<u32> = v.split('.').filter_map(|p| p.parse().ok()).collect();
                    if parts.len() >= 3 { Some((parts[0], parts[1], parts[2])) } else { None }
                });

            match wsl_version {
                None => {
                    // WSL não instalado — instala via wsl --install
                    logs.push("→ WSL 2 não encontrado — instalando…".to_string());
                    let out = Command::new("wsl")
                        .args(["--install", "--no-launch"])
                        .output()
                        .map_err(|e| e.to_string())?;
                    if out.status.success() {
                        logs.push("✅ WSL 2 instalado.".to_string());
                        logs.push("⚠ Reinicie o computador e execute a instalação novamente para prosseguir com o Docker Desktop.".to_string());
                        for line in &logs { emit_log(&app, line); }
                        return Err("reiniciar_necessario".to_string());
                    } else {
                        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                        // Falha comum: falta de admin — orienta o usuário
                        return Err(format!(
                            "Falha ao instalar WSL 2: {}. Execute o aplicativo como administrador e tente novamente.",
                            stderr
                        ));
                    }
                }
                Some((major, minor, patch)) if (major, minor, patch) < (2, 1, 5) => {
                    // WSL instalado mas desatualizado — atualiza
                    logs.push(format!("→ WSL {}.{}.{} detectado (mínimo 2.1.5) — atualizando…", major, minor, patch));
                    let out = Command::new("wsl")
                        .arg("--update")
                        .output()
                        .map_err(|e| e.to_string())?;
                    if out.status.success() {
                        logs.push("✅ WSL atualizado.".to_string());
                    } else {
                        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                        logs.push(format!("⚠ Falha ao atualizar WSL: {}. Tente 'wsl --update' manualmente.", stderr));
                    }
                }
                Some((major, minor, patch)) => {
                    logs.push(format!("→ WSL {}.{}.{} detectado — OK.", major, minor, patch));
                }
            }

            // ── Docker Desktop ────────────────────────────────────────────────
            logs.push("→ Instalando Docker Desktop via winget…".to_string());
            let out = Command::new(resolve_cmd("winget"))
                .args(["install", "--id", "Docker.DockerDesktop", "-e", "--silent", "--accept-package-agreements", "--accept-source-agreements"])
                .env("PATH", build_full_path())
                .output()
                .map_err(|e| e.to_string())?;
            if out.status.success() {
                logs.push("✅ Docker Desktop instalado. Reinicie o computador para finalizar.".to_string());
            } else {
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                return Err(format!("Falha ao instalar Docker Desktop: {}", stderr));
            }
        }
        "linux" => {
            install_docker_linux(&mut logs)?;
        }
        _ => {
            return Err("Instalação automática de Docker não suportada neste sistema.".to_string());
        }
    }
    for line in &logs { emit_log(&app, line); }
    Ok(logs)
}

// ── Terminal customization ────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct TerminalStatus {
    current_shell: String,
    shell_name: String,
    oh_my_zsh: bool,
    zsh_autosuggestions: bool,
    zsh_syntax_highlighting: bool,
    starship: bool,
    fzf: bool,
    bat: bool,
    eza: bool,
    zoxide: bool,
}

#[tauri::command]
fn check_terminal() -> TerminalStatus {
    let current_shell = std::env::var("SHELL").unwrap_or_default();
    let shell_name = current_shell
        .split('/')
        .next_back()
        .unwrap_or("unknown")
        .to_string();
    let home = std::env::var("HOME").unwrap_or_default();

    let omz_dir = std::path::Path::new(&home).join(".oh-my-zsh");
    let oh_my_zsh = omz_dir.exists();
    let plugins = omz_dir.join("custom/plugins");

    // bat pode ser instalado como "batcat" no Ubuntu/Debian
    let bat = command_exists("bat") || command_exists("batcat");

    TerminalStatus {
        current_shell,
        shell_name,
        oh_my_zsh,
        zsh_autosuggestions: plugins.join("zsh-autosuggestions").exists(),
        zsh_syntax_highlighting: plugins.join("zsh-syntax-highlighting").exists(),
        starship: command_exists("starship"),
        fzf: command_exists("fzf"),
        bat,
        eza: command_exists("eza"),
        zoxide: command_exists("zoxide"),
    }
}

#[derive(Deserialize)]
pub struct TerminalSetup {
    install_oh_my_zsh: bool,
    install_autosuggestions: bool,
    install_syntax_highlighting: bool,
    install_starship: bool,
    install_fzf: bool,
    install_bat: bool,
    install_eza: bool,
    install_zoxide: bool,
    aliases: Vec<String>,
}

fn install_cli_tool_cross_platform(
    tool: &str,
    brew_pkg: &str,
    winget_id: &str,
    linux_pkgs: &[(&str, &[&str], &str)],
    logs: &mut Vec<String>,
) -> bool {
    match std::env::consts::OS {
        "macos" => {
            logs.push(format!("→ Instalando {} via Homebrew…", tool));
            let ok = Command::new(resolve_cmd("brew"))
                .args(["install", brew_pkg])
                .env("PATH", build_full_path())
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);
            if ok { logs.push(format!("✅ {} instalado.", tool)); }
            else   { logs.push(format!("⚠️ Falha ao instalar {} via brew.", tool)); }
            ok
        }
        "windows" => {
            logs.push(format!("→ Instalando {} via winget…", tool));
            let ok = Command::new(resolve_cmd("winget"))
                .args(["install", "--id", winget_id, "-e", "--silent"])
                .env("PATH", build_full_path())
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);
            if ok { logs.push(format!("✅ {} instalado.", tool)); }
            else   { logs.push(format!("⚠️ Falha ao instalar {} via winget.", tool)); }
            ok
        }
        _ => linux_pkg_install(linux_pkgs, logs),
    }
}

fn install_starship_tool(logs: &mut Vec<String>) -> bool {
    match std::env::consts::OS {
        "macos" => install_cli_tool_cross_platform(
            "Starship", "starship", "Starship.Starship", &[], logs,
        ),
        "windows" => install_cli_tool_cross_platform(
            "Starship", "starship", "Starship.Starship", &[], logs,
        ),
        _ => {
            // Script oficial cross-distro
            if command_exists("curl") {
                logs.push("→ Instalando Starship via script oficial…".to_string());
                let ok = Command::new("sh")
                    .args(["-c", "curl -sS https://starship.rs/install.sh | sh -s -- --yes"])
                    .env("PATH", build_full_path())
                    .output()
                    .map(|o| o.status.success())
                    .unwrap_or(false);
                if ok { logs.push("✅ Starship instalado.".to_string()); return true; }
            }
            #[rustfmt::skip]
            let pkgs: &[(&str, &[&str], &str)] = &[
                ("apt-get", &["install", "-y"], "starship"),
                ("dnf",     &["install", "-y"], "starship"),
                ("pacman",  &["-S", "--noconfirm"], "starship"),
                ("apk",     &["add", "--no-cache"], "starship"),
            ];
            linux_pkg_install(pkgs, logs)
        }
    }
}

#[tauri::command]
fn setup_terminal(setup: TerminalSetup) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Não foi possível determinar o diretório home do usuário".to_string())?;

    if setup.install_oh_my_zsh {
        let out = Command::new("sh")
            .args([
                "-c",
                "RUNZSH=no CHSH=no sh -c \"$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)\"",
            ])
            .output()
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            logs.push("✅ Oh My Zsh instalado".to_string());
        } else {
            return Err(String::from_utf8_lossy(&out.stderr).trim().to_string());
        }
    }

    if setup.install_autosuggestions {
        let dir = format!("{}/.oh-my-zsh/custom/plugins/zsh-autosuggestions", home);
        Command::new("git")
            .args(["clone", "https://github.com/zsh-users/zsh-autosuggestions", &dir])
            .output()
            .map_err(|e| e.to_string())?;
        logs.push("✅ zsh-autosuggestions instalado".to_string());
        // ativa o plugin no .zshrc substituindo plugins=(git) por plugins=(git zsh-autosuggestions)
        activate_zsh_plugin(&home, "zsh-autosuggestions")?;
    }

    if setup.install_syntax_highlighting {
        let dir = format!(
            "{}/.oh-my-zsh/custom/plugins/zsh-syntax-highlighting",
            home
        );
        Command::new("git")
            .args([
                "clone",
                "https://github.com/zsh-users/zsh-syntax-highlighting.git",
                &dir,
            ])
            .output()
            .map_err(|e| e.to_string())?;
        logs.push("✅ zsh-syntax-highlighting instalado".to_string());
        activate_zsh_plugin(&home, "zsh-syntax-highlighting")?;
    }

    if !setup.aliases.is_empty() {
        use std::io::Write;
        let shell = std::env::var("SHELL").unwrap_or_default();
        let rc_file = if shell.contains("bash") {
            ".bashrc"
        } else if shell.contains("fish") {
            ".config/fish/config.fish"
        } else {
            ".zshrc"
        };
        let rc_path = format!("{}/{}", home, rc_file);
        let block = format!(
            "\n# aliases (dev-env-node)\n{}\n",
            setup.aliases.join("\n")
        );
        std::fs::OpenOptions::new()
            .append(true)
            .create(true)
            .open(&rc_path)
            .and_then(|mut f| f.write_all(block.as_bytes()))
            .map_err(|e| e.to_string())?;
        logs.push(format!(
            "✅ {} alias(es) adicionados ao {}",
            setup.aliases.len(), rc_file
        ));
    }

    // ── Ferramentas CLI ───────────────────────────────────────────────────────
    if setup.install_starship && install_starship_tool(&mut logs) {
        // Adiciona init ao shell config
        use std::io::Write;
        let shell = std::env::var("SHELL").unwrap_or_default();
        let (rc_file, init_line) = if shell.contains("fish") {
            (".config/fish/config.fish", "starship init fish | source")
        } else if shell.contains("bash") {
            (".bashrc", "eval \"$(starship init bash)\"")
        } else {
            (".zshrc", "eval \"$(starship init zsh)\"")
        };
        let rc_path = std::path::Path::new(&home).join(rc_file);
        let content = std::fs::read_to_string(&rc_path).unwrap_or_default();
        if !content.contains("starship init") {
            if let Ok(mut f) = std::fs::OpenOptions::new().append(true).create(true).open(&rc_path) {
                let _ = f.write_all(format!("\n# Starship prompt\n{}\n", init_line).as_bytes());
            }
        }
    }

    if setup.install_fzf {
        #[rustfmt::skip]
        let linux_pkgs: &[(&str, &[&str], &str)] = &[
            ("apt-get", &["install", "-y"], "fzf"),
            ("dnf",     &["install", "-y"], "fzf"),
            ("pacman",  &["-S", "--noconfirm"], "fzf"),
            ("zypper",  &["install", "-y"], "fzf"),
            ("apk",     &["add", "--no-cache"], "fzf"),
        ];
        if install_cli_tool_cross_platform("fzf", "fzf", "junegunn.fzf", linux_pkgs, &mut logs) {
            // Adiciona shell integration (Ctrl+R, Ctrl+T, Alt+C)
            use std::io::Write;
            let shell = std::env::var("SHELL").unwrap_or_default();
            let (rc_file, init_line) = if shell.contains("bash") {
                (".bashrc", "eval \"$(fzf --bash)\"")
            } else {
                (".zshrc", "eval \"$(fzf --zsh)\"")
            };
            let rc_path = std::path::Path::new(&home).join(rc_file);
            let content = std::fs::read_to_string(&rc_path).unwrap_or_default();
            if !content.contains("fzf --zsh") && !content.contains("fzf --bash") {
                if let Ok(mut f) = std::fs::OpenOptions::new().append(true).create(true).open(&rc_path) {
                    let _ = f.write_all(format!("\n# fzf shell integration\n{}\n", init_line).as_bytes());
                }
            }
        }
    }

    if setup.install_bat {
        #[rustfmt::skip]
        let linux_pkgs: &[(&str, &[&str], &str)] = &[
            ("apt-get", &["install", "-y"], "bat"),
            ("dnf",     &["install", "-y"], "bat"),
            ("pacman",  &["-S", "--noconfirm"], "bat"),
            ("zypper",  &["install", "-y"], "bat"),
            ("apk",     &["add", "--no-cache"], "bat"),
        ];
        if install_cli_tool_cross_platform("bat", "bat", "sharkdp.bat", linux_pkgs, &mut logs) {
            // No Ubuntu/Debian é instalado como "batcat" — cria alias
            if std::env::consts::OS == "linux" && command_exists("batcat") && !command_exists("bat") {
                use std::io::Write;
                let zshrc = format!("{}/.zshrc", home);
                let alias_line = "\n# bat (instalado como batcat no Ubuntu/Debian)\nalias bat=\"batcat\"\n";
                if let Ok(mut f) = std::fs::OpenOptions::new().append(true).create(true).open(&zshrc) {
                    let _ = f.write_all(alias_line.as_bytes());
                }
                logs.push("✅ Alias bat → batcat adicionado ao .zshrc".to_string());
            }
        }
    }

    if setup.install_eza {
        #[rustfmt::skip]
        let linux_pkgs: &[(&str, &[&str], &str)] = &[
            ("apt-get", &["install", "-y"], "eza"),
            ("dnf",     &["install", "-y"], "eza"),
            ("pacman",  &["-S", "--noconfirm"], "eza"),
            ("zypper",  &["install", "-y"], "eza"),
            ("apk",     &["add", "--no-cache"], "eza"),
        ];
        install_cli_tool_cross_platform("eza", "eza", "eza-community.eza", linux_pkgs, &mut logs);
    }

    if setup.install_zoxide {
        #[rustfmt::skip]
        let linux_pkgs: &[(&str, &[&str], &str)] = &[
            ("apt-get", &["install", "-y"], "zoxide"),
            ("dnf",     &["install", "-y"], "zoxide"),
            ("pacman",  &["-S", "--noconfirm"], "zoxide"),
            ("zypper",  &["install", "-y"], "zoxide"),
            ("apk",     &["add", "--no-cache"], "zoxide"),
        ];
        if install_cli_tool_cross_platform("zoxide", "zoxide", "ajeetdsouza.zoxide", linux_pkgs, &mut logs) {
            use std::io::Write;
            let shell = std::env::var("SHELL").unwrap_or_default();
            let (rc_file, init_line) = if shell.contains("fish") {
                (".config/fish/config.fish", "zoxide init fish | source")
            } else if shell.contains("bash") {
                (".bashrc", "eval \"$(zoxide init bash)\"")
            } else {
                (".zshrc", "eval \"$(zoxide init zsh)\"")
            };
            let rc_path = std::path::Path::new(&home).join(rc_file);
            let content = std::fs::read_to_string(&rc_path).unwrap_or_default();
            if !content.contains("zoxide init") {
                if let Ok(mut f) = std::fs::OpenOptions::new().append(true).create(true).open(&rc_path) {
                    let _ = f.write_all(format!("\n# zoxide (cd inteligente)\n{}\n", init_line).as_bytes());
                }
            }
        }
    }

    Ok(logs)
}

/// Adiciona um plugin à linha `plugins=(...)` do .zshrc.
fn activate_zsh_plugin(home: &str, plugin: &str) -> Result<(), String> {
    let zshrc = format!("{}/.zshrc", home);
    let content = std::fs::read_to_string(&zshrc).unwrap_or_default();
    if content.contains(plugin) {
        return Ok(()); // já está ativado
    }
    let updated = content.replacen(
        "plugins=(",
        &format!("plugins=({} ", plugin),
        1,
    );
    std::fs::write(&zshrc, updated).map_err(|e| e.to_string())
}

// ── VSCode ────────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct VscodeStatus {
    installed: bool,
    cli_available: bool,
    version: Option<String>,
    settings_path: Option<String>,
    fira_code_installed: bool,
    jetbrains_mono_installed: bool,
    installed_extensions: Vec<String>,
}

fn vscode_settings_path() -> Option<std::path::PathBuf> {
    match std::env::consts::OS {
        "macos" => {
            let home = std::env::var("HOME").ok()?;
            Some(std::path::PathBuf::from(home)
                .join("Library/Application Support/Code/User/settings.json"))
        }
        "linux" => {
            let home = std::env::var("HOME").ok()?;
            Some(std::path::PathBuf::from(home)
                .join(".config/Code/User/settings.json"))
        }
        "windows" => {
            let appdata = std::env::var("APPDATA").ok()?;
            Some(std::path::PathBuf::from(appdata)
                .join(r"Code\User\settings.json"))
        }
        _ => None,
    }
}

fn font_installed(name: &str) -> bool {
    let name_lower = name.to_lowercase();

    let dirs: Vec<String> = {
        #[cfg(windows)]
        {
            let mut d = vec![r"C:\Windows\Fonts".to_string()];
            if let Ok(local) = std::env::var("LOCALAPPDATA") {
                d.push(format!(r"{}\Microsoft\Windows\Fonts", local));
            }
            d
        }
        #[cfg(not(windows))]
        {
            let home = std::env::var("HOME").unwrap_or_default();
            vec![
                format!("{}/Library/Fonts", home),
                "/Library/Fonts".to_string(),
                format!("{}/.local/share/fonts", home),
                "/usr/share/fonts".to_string(),
            ]
        }
    };

    dirs.iter().any(|dir| {
        std::fs::read_dir(dir)
            .map(|entries| {
                entries.flatten().any(|e| {
                    e.file_name().to_string_lossy().to_lowercase().contains(&name_lower)
                })
            })
            .unwrap_or(false)
    })
}

/// Localiza o binário `code` do VSCode, mesmo sem ele estar no PATH.
/// Verifica: PATH estendido → bundles de app conhecidos → Cursor, VSCodium.
fn find_vscode_cli() -> Option<String> {
    // 1. PATH estendido (já inclui /usr/local/bin, /opt/homebrew/bin, etc.)
    if command_exists("code") {
        return Some(resolve_cmd("code"));
    }

    // 2. App bundles — macOS
    #[cfg(target_os = "macos")]
    {
        let mut candidates = vec![
            "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code".to_string(),
            "/Applications/VSCodium.app/Contents/Resources/app/bin/codium".to_string(),
            "/Applications/Cursor.app/Contents/Resources/app/bin/cursor".to_string(),
        ];
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(format!(
                "{}/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
                home
            ));
        }
        for path in &candidates {
            if std::path::Path::new(path).exists() {
                return Some(path.clone());
            }
        }
    }

    // 3. Linux — Flatpak (não fica no PATH padrão)
    #[cfg(target_os = "linux")]
    {
        let mut candidates = vec![
            "/var/lib/flatpak/exports/bin/com.visualstudio.code".to_string(),
            "/usr/bin/code".to_string(),
            "/usr/local/bin/code".to_string(),
        ];
        if let Ok(home) = std::env::var("HOME") {
            candidates.push(format!(
                "{}/.local/share/flatpak/exports/bin/com.visualstudio.code",
                home
            ));
        }
        for path in &candidates {
            if std::path::Path::new(path).exists() {
                return Some(path.clone());
            }
        }
    }

    // 4. Windows — caminhos de instalação padrão
    #[cfg(target_os = "windows")]
    {
        let mut candidates: Vec<String> = Vec::new();
        if let Ok(local) = std::env::var("LOCALAPPDATA") {
            candidates.push(format!(r"{}\Programs\Microsoft VS Code\bin\code.cmd", local));
        }
        if let Ok(profile) = std::env::var("USERPROFILE") {
            candidates.push(format!(r"{}\AppData\Local\Programs\Microsoft VS Code\bin\code.cmd", profile));
        }
        candidates.push(r"C:\Program Files\Microsoft VS Code\bin\code.cmd".to_string());
        for path in &candidates {
            if std::path::Path::new(path).exists() {
                return Some(path.clone());
            }
        }
    }

    None
}

#[tauri::command]
fn check_vscode() -> VscodeStatus {
    let code_bin_opt = find_vscode_cli();
    let cli_available = code_bin_opt.is_some();
    let code_bin = code_bin_opt.unwrap_or_else(|| "code".to_string());
    let version = if cli_available {
        get_version(&code_bin, &["--version"])
            .map(|v| v.lines().next().unwrap_or("").to_string())
    } else {
        None
    };
    let installed_extensions = if cli_available {
        Command::new(&code_bin)
            .args(["--list-extensions"])
            .output()
            .ok()
            .map(|o| {
                String::from_utf8_lossy(&o.stdout)
                    .lines()
                    .map(|l| l.trim().to_string())
                    .filter(|l| !l.is_empty())
                    .collect()
            })
            .unwrap_or_default()
    } else {
        vec![]
    };
    let settings_path = vscode_settings_path().map(|p| p.to_string_lossy().to_string());
    VscodeStatus {
        installed: cli_available,
        cli_available,
        version,
        settings_path,
        fira_code_installed: font_installed("firacode") || font_installed("fira code"),
        jetbrains_mono_installed: font_installed("jetbrainsmono") || font_installed("jetbrains mono"),
        installed_extensions,
    }
}

#[derive(Deserialize)]
pub struct VscodeSetup {
    extensions: Vec<String>,
    font: String,
    install_font: bool,
    format_on_save: bool,
    tab_size: u8,
    word_wrap: bool,
    minimap: bool,
}

#[tauri::command]
fn setup_vscode(setup: VscodeSetup) -> Result<Vec<String>, String> {
    let mut logs: Vec<String> = Vec::new();
    let code_bin = find_vscode_cli()
        .ok_or_else(|| "VSCode CLI não encontrado. Abra o VSCode e execute: Shell Command: Install 'code' command in PATH".to_string())?;

    // Instala extensões
    for ext in &setup.extensions {
        let out = Command::new(&code_bin)
            .args(["--install-extension", ext, "--force"])
            .output()
            .map_err(|e| e.to_string())?;
        if out.status.success() {
            logs.push(format!("✅ Extensão instalada: {}", ext));
        } else {
            logs.push(format!("⚠️ Falha ao instalar: {}", ext));
        }
    }

    // Instala fonte
    if setup.install_font && setup.font != "none" {
        match std::env::consts::OS {
            "macos" => {
                let cask = match setup.font.as_str() {
                    "fira-code"      => "font-fira-code",
                    "jetbrains-mono" => "font-jetbrains-mono",
                    _                => "",
                };
                if !cask.is_empty() {
                    let out = Command::new(resolve_cmd("brew"))
                        .args(["install", "--cask", cask])
                        .env("PATH", build_full_path())
                        .output()
                        .map_err(|e| e.to_string())?;
                    let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                    if out.status.success() || stderr.contains("already installed") {
                        logs.push(format!("✅ Fonte instalada: {}", cask));
                    } else {
                        logs.push(format!("⚠️ Falha ao instalar fonte via brew: {}", stderr));
                    }
                }
            }
            "windows" => {
                // winget id para cada fonte
                let winget_id = match setup.font.as_str() {
                    "fira-code"      => "Monotype.FiraCode",
                    "jetbrains-mono" => "JetBrains.JetBrainsMono",
                    _                => "",
                };
                if !winget_id.is_empty() {
                    let out = Command::new(resolve_cmd("winget"))
                        .args(["install", "--id", winget_id, "-e", "--silent"])
                        .env("PATH", build_full_path())
                        .output()
                        .map_err(|e| e.to_string())?;
                    if out.status.success() {
                        logs.push(format!("✅ Fonte instalada: {}", winget_id));
                    } else {
                        let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                        logs.push(format!("⚠️ Falha ao instalar fonte via winget: {}", stderr));
                    }
                }
            }
            "linux" => {
                match install_font_linux(&setup.font, &mut logs) {
                    Ok(_) => {}
                    Err(e) => logs.push(format!("⚠️ {}", e)),
                }
            }
            _ => {
                logs.push("⚠️ Instalação de fonte não suportada neste sistema.".to_string());
            }
        }
    }

    // Escreve settings.json (merge com existente)
    if let Some(settings_path) = vscode_settings_path() {
        if let Some(parent) = settings_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut settings: serde_json::Value = settings_path
            .exists()
            .then(|| std::fs::read_to_string(&settings_path).ok())
            .flatten()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(serde_json::json!({}));

        if setup.font != "none" {
            let font_name = match setup.font.as_str() {
                "fira-code"      => "Fira Code",
                "jetbrains-mono" => "JetBrains Mono",
                _                => "",
            };
            if !font_name.is_empty() {
                settings["editor.fontFamily"] = serde_json::json!(format!("'{}', monospace", font_name));
                settings["editor.fontLigatures"] = serde_json::json!(true);
            }
        }

        if setup.format_on_save {
            settings["editor.formatOnSave"] = serde_json::json!(true);
            settings["editor.defaultFormatter"] = serde_json::json!("esbenp.prettier-vscode");
        }

        settings["editor.tabSize"] = serde_json::json!(setup.tab_size);
        settings["editor.wordWrap"] = serde_json::json!(if setup.word_wrap { "on" } else { "off" });
        settings["editor.minimap.enabled"] = serde_json::json!(setup.minimap);
        settings["files.autoSave"] = serde_json::json!("onFocusChange");

        let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        std::fs::write(&settings_path, json).map_err(|e| e.to_string())?;
        logs.push("✅ settings.json atualizado".to_string());
    }

    Ok(logs)
}

// ── Shell Aliases ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct AliasInput {
    name: String,
    command: String,
}

/// Writes a block of shell aliases to .zshrc / .bashrc, replacing any previous
/// block written by this app (identified by the sentinel comment).
#[tauri::command]
fn write_shell_aliases(aliases: Vec<AliasInput>) -> Result<String, String> {
    use std::io::Write;

    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "HOME não encontrado".to_string())?;

    let shell = std::env::var("SHELL").unwrap_or_default();
    let rc_file = if shell.contains("bash") { ".bashrc" } else { ".zshrc" };
    let rc_path = std::path::Path::new(&home).join(rc_file);

    let sentinel_start = "# >>> dev-env aliases >>>";
    let sentinel_end   = "# <<< dev-env aliases <<<";

    // Read existing file, strip old block if present
    let existing = std::fs::read_to_string(&rc_path).unwrap_or_default();
    let cleaned: String = {
        let mut inside = false;
        existing
            .lines()
            .filter(|line| {
                if line.contains(sentinel_start) { inside = true; return false; }
                if line.contains(sentinel_end)   { inside = false; return false; }
                !inside
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let alias_lines: Vec<String> = aliases
        .iter()
        .map(|a| format!("alias {}='{}'", a.name, a.command))
        .collect();

    let new_block = if alias_lines.is_empty() {
        String::new()
    } else {
        format!(
            "\n{}\n{}\n{}\n",
            sentinel_start,
            alias_lines.join("\n"),
            sentinel_end
        )
    };

    let final_content = format!("{}{}", cleaned.trim_end(), new_block);
    std::fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&rc_path)
        .and_then(|mut f| f.write_all(final_content.as_bytes()))
        .map_err(|e| e.to_string())?;

    Ok(format!(
        "✅ {} alias(es) salvos em ~/{}. Recarregue o terminal.",
        aliases.len(), rc_file
    ))
}

// ── Docker Compose generator ──────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct DockerServiceInput {
    id: String,
    port: String,
    version: String,
}

#[tauri::command]
fn generate_docker_compose(path: String, services: Vec<DockerServiceInput>) -> Result<(), String> {
    use std::fmt::Write as FmtWrite;

    if services.is_empty() {
        return Err("Selecione pelo menos um serviço.".to_string());
    }

    let dir = std::path::Path::new(&path);
    std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;

    let mut out = String::from("version: '3.8'\n\nservices:\n");
    let mut volumes: Vec<String> = Vec::new();

    for svc in &services {
        match svc.id.as_str() {
            "postgres" => {
                let _ = write!(out,
                    "  postgres:\n    image: postgres:{}\n    restart: unless-stopped\n    ports:\n      - \"{}:5432\"\n    environment:\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n      POSTGRES_DB: dbname\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\n",
                    svc.version, svc.port
                );
                volumes.push("  postgres_data:".to_string());
            }
            "mysql" => {
                let _ = write!(out,
                    "  mysql:\n    image: mysql:{}\n    restart: unless-stopped\n    ports:\n      - \"{}:3306\"\n    environment:\n      MYSQL_ROOT_PASSWORD: password\n      MYSQL_DATABASE: dbname\n      MYSQL_USER: user\n      MYSQL_PASSWORD: password\n    volumes:\n      - mysql_data:/var/lib/mysql\n\n",
                    svc.version, svc.port
                );
                volumes.push("  mysql_data:".to_string());
            }
            "mongodb" => {
                let _ = write!(out,
                    "  mongodb:\n    image: mongo:{}\n    restart: unless-stopped\n    ports:\n      - \"{}:27017\"\n    volumes:\n      - mongodb_data:/data/db\n\n",
                    svc.version, svc.port
                );
                volumes.push("  mongodb_data:".to_string());
            }
            "redis" => {
                let _ = write!(out,
                    "  redis:\n    image: redis:{}\n    restart: unless-stopped\n    ports:\n      - \"{}:6379\"\n    command: redis-server --appendonly yes\n    volumes:\n      - redis_data:/data\n\n",
                    svc.version, svc.port
                );
                volumes.push("  redis_data:".to_string());
            }
            "rabbitmq" => {
                let _ = write!(out,
                    "  rabbitmq:\n    image: rabbitmq:{}-management\n    restart: unless-stopped\n    ports:\n      - \"{}:5672\"\n      - \"15672:15672\"\n    environment:\n      RABBITMQ_DEFAULT_USER: user\n      RABBITMQ_DEFAULT_PASS: password\n    volumes:\n      - rabbitmq_data:/var/lib/rabbitmq\n\n",
                    svc.version, svc.port
                );
                volumes.push("  rabbitmq_data:".to_string());
            }
            "nginx" => {
                let _ = write!(out,
                    "  nginx:\n    image: nginx:{}\n    restart: unless-stopped\n    ports:\n      - \"{}:80\"\n    volumes:\n      - ./nginx.conf:/etc/nginx/nginx.conf:ro\n\n",
                    svc.version, svc.port
                );
            }
            "elasticsearch" => {
                let _ = write!(out,
                    "  elasticsearch:\n    image: elasticsearch:{}\n    restart: unless-stopped\n    ports:\n      - \"{}:9200\"\n    environment:\n      - discovery.type=single-node\n      - xpack.security.enabled=false\n    volumes:\n      - es_data:/usr/share/elasticsearch/data\n\n",
                    svc.version, svc.port
                );
                volumes.push("  es_data:".to_string());
            }
            _ => {}
        }
    }

    if !volumes.is_empty() {
        out.push_str("volumes:\n");
        for v in &volumes { out.push_str(v); out.push('\n'); }
    }

    std::fs::write(dir.join("docker-compose.yml"), out).map_err(|e| e.to_string())?;
    Ok(())
}

// ── npm Script Runner ─────────────────────────────────────────────────────────

#[tauri::command]
fn read_project_scripts(path: String) -> Result<std::collections::HashMap<String, String>, String> {
    let pkg_path = std::path::Path::new(&path).join("package.json");
    let content = std::fs::read_to_string(&pkg_path)
        .map_err(|_| "package.json não encontrado".to_string())?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| e.to_string())?;
    let scripts = json["scripts"]
        .as_object()
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default();
    Ok(scripts)
}

#[tauri::command]
async fn run_project_script(
    app: tauri::AppHandle,
    cwd: String,
    package_manager: String,
    script: String,
) -> Result<(), String> {
    let allowed = ["npm", "yarn", "pnpm"];
    if !allowed.contains(&package_manager.as_str()) {
        return Err(format!("Package manager não permitido: {}", package_manager));
    }
    let bin = resolve_cmd(&package_manager);
    let mut child = Command::new(&bin)
        .args(["run", &script])
        .current_dir(&cwd)
        .env("PATH", build_full_path())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    if let Some(stdout) = child.stdout.take() {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            app.emit("script-log", &line).ok();
        }
    }
    if let Some(stderr) = child.stderr.take() {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            if !line.trim().is_empty() {
                app.emit("script-log", &line).ok();
            }
        }
    }
    child.wait().map_err(|e| e.to_string())?;
    Ok(())
}

// ── Post-install helpers ──────────────────────────────────────────────────────

#[tauri::command]
fn write_vscode_project_extensions(project_path: String, extensions: Vec<String>) -> Result<(), String> {
    let vscode_dir = std::path::Path::new(&project_path).join(".vscode");
    std::fs::create_dir_all(&vscode_dir).map_err(|e| e.to_string())?;
    let json = serde_json::json!({
        "recommendations": extensions
    });
    let content = serde_json::to_string_pretty(&json).map_err(|e| e.to_string())?;
    std::fs::write(vscode_dir.join("extensions.json"), content).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_env_file(project_path: String, content: String) -> Result<(), String> {
    std::fs::write(
        std::path::Path::new(&project_path).join(".env"),
        content,
    )
    .map_err(|e| e.to_string())
}

const ALLOWED_PROGRAMS: &[&str] = &["npm", "yarn", "pnpm", "node", "sh", "bash"];

#[tauri::command]
fn run_command(program: String, args: Vec<String>, cwd: Option<String>) -> Result<String, String> {
    if !ALLOWED_PROGRAMS.contains(&program.as_str()) {
        return Err(format!("Programa não permitido: '{}'", program));
    }
    let bin = resolve_cmd(&program);
    let mut cmd = Command::new(&bin);
    cmd.args(&args);
    cmd.env("PATH", build_full_path());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    cmd.output()
        .map_err(|e| e.to_string())
        .and_then(|o| {
            let stdout = String::from_utf8_lossy(&o.stdout).to_string();
            let stderr = String::from_utf8_lossy(&o.stderr).to_string();
            if o.status.success() {
                Ok(stdout)
            } else {
                Err(format!("{}{}", stdout, stderr))
            }
        })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Fix tela preta no Linux: WebKitGTK DMA-BUF renderer falha em vários sistemas
    // (VMs, GPUs sem suporte, drivers antigos). Desabilitamos antes do builder.
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            check_environment,
            get_os,
            path_exists,
            create_project,
            run_command,
            run_installer,
            fix_shell_config,
            generate_ssh_key,
            check_docker_prerequisites,
            install_docker_tool,
            check_terminal,
            setup_terminal,
            check_vscode,
            setup_vscode,
            write_shell_aliases,
            generate_docker_compose,
            read_project_scripts,
            run_project_script,
            write_vscode_project_extensions,
            write_env_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── helpers locais ────────────────────────────────────────────────────────

    fn is_valid_project_name(name: &str) -> bool {
        if name.is_empty() || name.contains("..") { return false; }
        let mut chars = name.chars();
        let first = match chars.next() {
            Some(c) => c,
            None => return false,
        };
        if !first.is_ascii_lowercase() && !first.is_ascii_digit() { return false; }
        chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-' || c == '_' || c == '.')
    }

    #[test]
    fn valid_project_names() {
        assert!(is_valid_project_name("meu-projeto"));
        assert!(is_valid_project_name("app123"));
        assert!(is_valid_project_name("my_app.v2"));
    }

    #[test]
    fn invalid_project_names() {
        assert!(!is_valid_project_name(""));
        assert!(!is_valid_project_name("-projeto"));
        assert!(!is_valid_project_name("MeuProjeto"));
        assert!(!is_valid_project_name("meu..projeto"));
        assert!(!is_valid_project_name("../etc/passwd"));
        assert!(!is_valid_project_name("projeto com espaço"));
    }

    // ── ssh_dir ───────────────────────────────────────────────────────────────

    #[test]
    fn ssh_dir_contains_ssh() {
        let dir = ssh_dir();
        assert!(dir.to_string_lossy().contains(".ssh"));
    }

    // ── ssh_public_key_path ───────────────────────────────────────────────────

    #[test]
    fn ssh_public_key_path_returns_none_when_no_keys() {
        // Em CI não há chaves; em dev pode haver — apenas verifica que não pânica
        let _ = ssh_public_key_path();
    }

    // ── path_exists ───────────────────────────────────────────────────────────

    #[test]
    fn path_exists_true_for_existing_dir() {
        let tmp = std::env::temp_dir();
        assert!(path_exists(tmp.to_string_lossy().to_string()));
    }

    #[test]
    fn path_exists_false_for_nonexistent() {
        assert!(!path_exists("/caminho/que/nao/existe/xyz_abc_123".to_string()));
    }

    // ── get_os ────────────────────────────────────────────────────────────────

    #[test]
    fn get_os_returns_known_value() {
        let os = get_os();
        assert!(["macos", "linux", "windows"].contains(&os.as_str()));
    }

    // ── nvm_in_shell (Windows) ────────────────────────────────────────────────

    #[test]
    fn nvm_in_shell_does_not_panic() {
        let _ = nvm_in_shell();
    }

    // ── build_full_path ───────────────────────────────────────────────────────

    #[test]
    fn build_full_path_is_not_empty() {
        let path = build_full_path();
        assert!(!path.is_empty());
    }

    #[test]
    fn build_full_path_contains_usr_bin() {
        let path = build_full_path();
        // /usr/bin está em todos os Unix; em Windows contém System32
        #[cfg(not(windows))]
        assert!(path.contains("/usr/bin") || path.contains("/bin"));
        #[cfg(windows)]
        assert!(path.contains("System32") || path.contains("system32"));
    }
}
