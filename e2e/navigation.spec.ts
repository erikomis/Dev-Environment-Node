import { test, expect } from "@playwright/test";
import { mockTauriIpc } from "./helpers/tauri-mock";

test.describe("Navegação entre views", () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriIpc(page);
    await page.goto("/");
  });

  test("navega para a view Terminal e volta para Home", async ({ page }) => {
    await page.getByRole("button", { name: /customizar terminal|customize terminal/i }).click();
    // A view de terminal deve aparecer (não há mais o header da Home)
    await expect(page.getByText("Dev Environment Node")).not.toBeVisible();
    // Volta para home
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await expect(page.getByText("Dev Environment Node")).toBeVisible();
  });

  test("navega para VSCode e volta para Home", async ({ page }) => {
    await page.getByRole("button", { name: /configurar vscode|configure vscode/i }).click();
    await expect(page.getByText("Dev Environment Node")).not.toBeVisible();
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await expect(page.getByText("Dev Environment Node")).toBeVisible();
  });

  test("navega para Shell Aliases e volta para Home", async ({ page }) => {
    await page.getByRole("button", { name: /aliases/i }).click();
    await expect(page.getByText("Dev Environment Node")).not.toBeVisible();
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await expect(page.getByText("Dev Environment Node")).toBeVisible();
  });

  test("navega para Docker Compose e volta para Home", async ({ page }) => {
    await page.getByRole("button", { name: /docker compose/i }).click();
    await expect(page.getByText("Dev Environment Node")).not.toBeVisible();
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await expect(page.getByText("Dev Environment Node")).toBeVisible();
  });

  test("navega para Projetos Criados e volta para Home", async ({ page }) => {
    await page.getByRole("button", { name: /projetos criados|created projects/i }).click();
    await expect(page.getByText("Dev Environment Node")).not.toBeVisible();
    await page.getByRole("button", { name: /voltar|back/i }).click();
    await expect(page.getByText("Dev Environment Node")).toBeVisible();
  });

  test("navega para o Wizard ao clicar em Configurar Ambiente", async ({ page }) => {
    await page.getByRole("button", { name: /configurar ambiente|configure environment/i }).click();
    // O wizard deve aparecer — o header da Home some
    await expect(page.getByText("Dev Environment Node")).not.toBeVisible();
  });
});
