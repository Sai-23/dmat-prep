"use client";

import { useTheme } from "next-themes";

export function useResolvedTheme() {
  const { resolvedTheme, systemTheme, theme } = useTheme();
  return {
    preference: theme,
    resolvedTheme,
    systemTheme,
    isDark: resolvedTheme === "dark",
  };
}
