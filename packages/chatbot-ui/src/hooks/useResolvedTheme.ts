import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

export function useResolvedTheme(
  theme: "light" | "dark" | "auto"
): ThemeMode {
  const [resolved, setResolved] = useState<ThemeMode>(() => {
    if (theme === "light" || theme === "dark") return theme;
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    if (theme === "light" || theme === "dark") {
      setResolved(theme);
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () =>
      setResolved(mq.matches ? "dark" : "light");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  return resolved;
}
