import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";
export type AccentColor = "indigo" | "violet" | "emerald" | "rose" | "amber" | "blue";

export const ACCENT_COLORS: Record<AccentColor, string> = {
  indigo: "243 75% 59%",
  violet: "258 90% 66%",
  emerald: "160 84% 39%",
  rose: "350 89% 60%",
  amber: "38 92% 50%",
  blue: "221 83% 53%",
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme;
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme;
      if (saved === "light" || saved === "dark") {
        return saved;
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "dark";
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("accent-color") as AccentColor;
      if (saved && saved in ACCENT_COLORS) {
        return saved;
      }
    }
    return "indigo";
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem("accent-color", color);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    const doc = document as any;

    if (!doc.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const root = window.document.documentElement;
    root.classList.add("theme-transitioning");
    if (nextTheme === "dark") {
      root.classList.add("theme-transition-to-dark");
      root.classList.remove("theme-transition-to-light");
    } else {
      root.classList.add("theme-transition-to-light");
      root.classList.remove("theme-transition-to-dark");
    }

    const transition = doc.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.finished.finally(() => {
      root.classList.remove(
        "theme-transitioning",
        "theme-transition-to-dark",
        "theme-transition-to-light"
      );
    });
  };

  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateThemeClass = () => {
      const systemDark = mediaQuery.matches;
      const isDarkTheme = theme === "dark" || (theme === "system" && systemDark);
      console.log(`[Theme] theme state: ${theme}, system prefers dark: ${systemDark}, resolved isDark: ${isDarkTheme}`);
      if (isDarkTheme) {
        root.classList.add("dark");
        setResolvedTheme("dark");
      } else {
        root.classList.remove("dark");
        setResolvedTheme("light");
      }
    };

    updateThemeClass();
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", updateThemeClass);
    } else {
      mediaQuery.addListener(updateThemeClass);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", updateThemeClass);
      } else {
        mediaQuery.removeListener(updateThemeClass);
      }
    };
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const hslValue = ACCENT_COLORS[accentColor];
    if (hslValue) {
      root.style.setProperty("--primary", hslValue);
      root.style.setProperty("--ring", hslValue);
      root.style.setProperty("--sidebar-primary", hslValue);
      root.style.setProperty("--sidebar-ring", hslValue);
      root.style.setProperty("--chart-1", hslValue);
    }
  }, [accentColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        isDark: resolvedTheme === "dark",
        accentColor,
        setAccentColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
