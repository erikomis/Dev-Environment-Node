import { useState, useEffect, type ReactNode } from "react";
import { I18nContext, TRANSLATIONS, detectLocale, persistLocale, type Locale } from "./context";

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  function setLocale(l: Locale) {
    persistLocale(l);
    setLocaleState(l);
  }

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: TRANSLATIONS[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}
