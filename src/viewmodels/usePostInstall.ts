import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Framework } from "../models";

// Extension recommendations per framework
const EXTENSIONS: Record<string, string[]> = {
  express:  ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "humao.rest-client", "eamodio.gitlens"],
  fastify:  ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "humao.rest-client", "eamodio.gitlens"],
  nestjs:   ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "firsttris.vscode-jest-runner", "eamodio.gitlens"],
  next:     ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "bradlc.vscode-tailwindcss", "prisma.prisma", "eamodio.gitlens"],
  nuxt:     ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "Vue.volar", "eamodio.gitlens"],
  angular:  ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "Angular.ng-template", "eamodio.gitlens"],
  vite:     ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "bradlc.vscode-tailwindcss", "eamodio.gitlens"],
  turborepo:["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "eamodio.gitlens"],
  nx:       ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode", "nrwl.angular-console", "eamodio.gitlens"],
};

export function recommendedExtensions(framework: Framework): string[] {
  return EXTENSIONS[framework] ?? EXTENSIONS["express"];
}

function buildEnvTemplate(framework: Framework, database: string): string {
  let env = "PORT=3000\nNODE_ENV=development\n";
  if (["express", "fastify", "nestjs"].includes(framework)) {
    env += "# JWT_SECRET=your_secret_here\n";
  }
  switch (database) {
    case "postgres":
      env += "DATABASE_URL=postgresql://user:password@localhost:5432/dbname\n";
      break;
    case "mysql":
      env += "DATABASE_URL=mysql://user:password@localhost:3306/dbname\n";
      break;
    case "mongodb":
      env += "MONGODB_URI=mongodb://localhost:27017/dbname\n";
      break;
  }
  return env;
}

export function usePostInstall(
  projectPath: string,
  projectName: string,
  framework: Framework,
  database: string,
) {
  const fullPath = `${projectPath}/${projectName}`;
  const extensions = recommendedExtensions(framework);
  const [selectedExtensions, setSelectedExtensions] = useState<string[]>(extensions);
  const [installingExtensions, setInstallingExtensions] = useState(false);
  const [extensionsDone, setExtensionsDone] = useState(false);

  const [envContent, setEnvContent] = useState(() => buildEnvTemplate(framework, database));
  const [savingEnv, setSavingEnv] = useState(false);
  const [envDone, setEnvDone] = useState(false);

  function toggleExtension(ext: string) {
    setSelectedExtensions((prev) =>
      prev.includes(ext) ? prev.filter((e) => e !== ext) : [...prev, ext]
    );
  }

  async function installExtensions() {
    if (selectedExtensions.length === 0) return;
    setInstallingExtensions(true);
    try {
      await invoke("write_vscode_project_extensions", {
        projectPath: fullPath,
        extensions: selectedExtensions,
      });
      setExtensionsDone(true);
    } catch {
      /* ignore */
    } finally {
      setInstallingExtensions(false);
    }
  }

  async function saveEnv() {
    setSavingEnv(true);
    try {
      await invoke("write_env_file", { projectPath: fullPath, content: envContent });
      setEnvDone(true);
    } catch {
      /* ignore */
    } finally {
      setSavingEnv(false);
    }
  }

  return {
    extensions,
    selectedExtensions,
    toggleExtension,
    installingExtensions,
    extensionsDone,
    installExtensions,
    envContent,
    setEnvContent,
    savingEnv,
    envDone,
    saveEnv,
  };
}
