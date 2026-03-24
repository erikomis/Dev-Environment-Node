import { test, expect } from "@playwright/test";
import { mockTauriIpc, mockEnvMissing } from "./helpers/tauri-mock";

test.describe("Home screen", () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriIpc(page);
    await page.goto("/");
  });

  test("exibe o header com o nome do app", async ({ page }) => {
    await expect(page.getByText("Dev Environment Node")).toBeVisible();
  });

  test("exibe o footer com a tagline", async ({ page }) => {
    await expect(page.getByText("Tauri · React · Rust")).toBeVisible();
  });

  test("exibe os 3 cards de ferramentas (Node, Docker, Git)", async ({ page }) => {
    await expect(page.getByText("Node.js", { exact: true })).toBeVisible();
    await expect(page.getByText("Docker", { exact: true })).toBeVisible();
    await expect(page.getByText("Git", { exact: true })).toBeVisible();
  });

  test("exibe o botão principal de configurar ambiente", async ({ page }) => {
    const btn = page.getByRole("button", { name: /configurar ambiente|configure environment/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test("exibe botões secundários de customização", async ({ page }) => {
    await expect(page.getByRole("button", { name: /customizar terminal|customize terminal/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /configurar vscode|configure vscode/i })).toBeVisible();
  });

  test("exibe botões ghost de navegação", async ({ page }) => {
    await expect(page.getByRole("button", { name: /aliases/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /docker compose/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /projetos|projects/i })).toBeVisible();
  });

  test("exibe badge 'via nvm' no card do Node quando instalado via nvm", async ({ page }) => {
    await expect(page.getByText("via nvm")).toBeVisible();
  });

  test("exibe mensagem de ambiente pronto quando tudo instalado", async ({ page }) => {
    await expect(
      page.getByText(/ambiente detectado|environment detected/i)
    ).toBeVisible();
  });

  test("exibe mensagem de ferramentas faltando quando env incompleto", async ({ page }) => {
    await mockTauriIpc(page, { check_environment: mockEnvMissing });
    await page.goto("/");
    await expect(
      page.getByText(/ferramentas faltando|missing tools/i)
    ).toBeVisible();
  });
});
