"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";

export function ThemeMenu({ compact = false }: { compact?: boolean }) {
  return <ThemeToggle compact={compact} />;
}
