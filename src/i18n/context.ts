import { createContext } from "react";
import { ptBr } from "./pt-br";
import { en } from "./en";
import type { Translations } from "./pt-br";

export type Locale = "pt-br" | "en";

export const TRANSLATIONS: Record<Locale, Translations> = { "pt-br": ptBr, en };

const STORAGE_KEY = "dev-env-locale";

export function detectLocale(): Locale {
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && stored in TRANSLATIONS) return stored;
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("pt")) return "pt-br";
  return "en";
}

export function persistLocale(locale: Locale): void {
  localStorage.setItem(STORAGE_KEY, locale);
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
