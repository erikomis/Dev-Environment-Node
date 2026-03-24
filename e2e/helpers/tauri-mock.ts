import type { Page } from "@playwright/test";
import type { EnvStatus } from "../../src/models";

export const mockEnvReady: EnvStatus = {
  node: true,
  node_via_nvm: true,
  nvm: true,
  docker: true,
  orbstack: false,
  git: true,
  node_version: "v20.11.0",
  docker_version: "Docker version 24.0.7, build afdd53b",
  git_version: "git version 2.40.0",
  nvm_in_shell: true,
  git_name: "Dev Test",
  git_email: "dev@test.com",
  yarn: false,
  pnpm: false,
  ssh_key: true,
  ssh_public_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 dev@test.com",
};

export const mockEnvMissing: EnvStatus = {
  ...mockEnvReady,
  node: false,
  docker: false,
  node_version: null,
  docker_version: null,
};

/**
 * Injeta o mock do Tauri IPC antes do app carregar.
 * Deve ser chamado ANTES de page.goto().
 */
export async function mockTauriIpc(
  page: Page,
  overrides: Partial<Record<string, unknown>> = {}
) {
  const handlers: Record<string, unknown> = {
    check_environment: mockEnvReady,
    check_terminal: {
      current_shell: "/bin/zsh",
      shell_name: "zsh",
      oh_my_zsh: false,
      zsh_autosuggestions: false,
      zsh_syntax_highlighting: false,
      starship: false,
      fzf: false,
      bat: false,
      eza: false,
      zoxide: false,
    },
    check_vscode: {
      installed: true,
      cli_available: true,
      version: "1.88.0",
      settings_path: "/Users/test/.config/Code/User/settings.json",
      fira_code_installed: false,
      jetbrains_mono_installed: false,
      installed_extensions: [],
    },
    get_created_projects: [],
    get_shell_aliases: [],
    ...overrides,
  };

  await page.addInitScript((h) => {
    (window as Record<string, unknown>)["__TAURI_INTERNALS__"] = {
      invoke: async (cmd: string) => {
        const result = (h as Record<string, unknown>)[cmd];
        if (result === undefined) {
          return null;
        }
        return result;
      },
      transformCallback: () => 0,
      metadata: {
        currentWindow: { label: "main" },
        windows: [{ label: "main" }],
      },
    };
  }, handlers);
}
