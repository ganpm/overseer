import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

export const useTheme = () => {
  const defaultTheme: Theme = "light";
  const storedTheme = localStorage.getItem("theme") as Theme | null;
  const [theme, setTheme] = useState<Theme>(storedTheme || defaultTheme);
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  return { theme, setTheme, toggleTheme };
}