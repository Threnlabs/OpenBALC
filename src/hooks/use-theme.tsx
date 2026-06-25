import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme") as Theme;
      if (saved === "light" || saved === "dark") {
        return saved;
      }
      return "dark"; // Default theme
    }
    return "dark";
  });

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const doc = document as any;

    if (!doc.startViewTransition) {
      setThemeState(nextTheme);
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
      setThemeState(nextTheme);
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
    if (theme === "dark") {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === "dark" }}>
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
