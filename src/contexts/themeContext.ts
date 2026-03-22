import { createContext } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "dev-env-theme";

export function detectTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === "light" || stored === "dark") return stored;
  return globalThis.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

export function persistTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.dataset.theme = theme;
}

export interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
