"use client";

import {
  ThemeProvider as NextThemesProvider,
  useTheme,
} from "next-themes";
import { useEffect, type ComponentProps } from "react";

import { isThemePreference } from "@/lib/theme";

function ThemeStorageSync() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const synchronize = (event: StorageEvent) => {
      if (
        event.key === "theme" &&
        event.newValue &&
        isThemePreference(event.newValue)
      ) {
        setTheme(event.newValue);
      }
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, [setTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
      storageKey="theme"
      {...props}
    >
      <ThemeStorageSync />
      {children}
    </NextThemesProvider>
  );
}
