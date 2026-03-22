import { useState, useEffect, useMemo, type ReactNode } from "react";
import { ThemeContext, detectTheme, persistTheme, type Theme } from "./themeContext";

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setTheme] = useState<Theme>(detectTheme);

  useEffect(() => {
    persistTheme(theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  const value = useMemo(() => ({ theme, toggle }), [theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
