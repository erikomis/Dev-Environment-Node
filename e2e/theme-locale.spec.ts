import { test, expect } from "@playwright/test";
import { mockTauriIpc } from "./helpers/tauri-mock";

test.describe("Theme e Locale", () => {
  test.beforeEach(async ({ page }) => {
    await mockTauriIpc(page);
    await page.goto("/");
  });

  test("toggle de tema muda entre dark e light", async ({ page }) => {
    // Força tema dark antes de recarregar (addInitScript persiste para gotos subsequentes)
    await page.addInitScript(() => {
      localStorage.setItem("dev-env-theme", "dark");
    });
    await page.goto("/");

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    await page.getByTitle(/light mode|dark mode/i).click();
    await expect(html).toHaveAttribute("data-theme", "light");

    await page.getByTitle(/light mode|dark mode/i).click();
    await expect(html).toHaveAttribute("data-theme", "dark");
  });

  test("toggle de locale muda entre PT-BR e EN", async ({ page }) => {
    // Força pt-br via localStorage e recarrega (sem addInitScript para não interferir no reload)
    await page.evaluate(() => localStorage.setItem("dev-env-locale", "pt-br"));
    await page.reload();

    await expect(page.getByRole("button", { name: "EN", exact: true })).toBeVisible();
    await expect(page.getByText("Configure seu ambiente")).toBeVisible();

    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByRole("button", { name: "PT", exact: true })).toBeVisible();
    await expect(page.getByText("Configure your environment")).toBeVisible();

    await page.getByRole("button", { name: "PT", exact: true }).click();
    await expect(page.getByText("Configure seu ambiente")).toBeVisible();
  });

  test("preferência de locale persiste via localStorage após reload", async ({ page }) => {
    // Começa em pt-br
    await page.evaluate(() => localStorage.setItem("dev-env-locale", "pt-br"));
    await page.reload();
    await expect(page.getByText("Configure seu ambiente")).toBeVisible();

    // Muda para EN
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(page.getByText("Configure your environment")).toBeVisible();

    // Recarrega — localStorage tem "en", init scripts não forçam locale
    await page.reload();
    await expect(page.getByText("Configure your environment")).toBeVisible();
  });
});
