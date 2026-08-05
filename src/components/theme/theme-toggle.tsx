"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore, useTransition } from "react";

import { saveThemePreferenceAction } from "@/app/auth/actions";
import { cn } from "@/lib/utils";
import {
  THEME_PREFERENCES,
  type ThemePreference,
} from "@/lib/theme";

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] satisfies Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}>;

const subscribeToHydration = () => () => undefined;

export function ThemeToggle({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [, startTransition] = useTransition();

  const selectTheme = (preference: ThemePreference) => {
    setTheme(preference);
    startTransition(async () => {
      await saveThemePreferenceAction(preference);
    });
  };

  const selected = THEME_PREFERENCES.includes(theme as ThemePreference)
    ? (theme as ThemePreference)
    : "system";

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-9 rounded-md border border-workspace-border bg-surface-low",
          compact ? "w-9" : "w-[214px]",
          className,
        )}
      />
    );
  }

  if (compact) {
    const currentOption =
      options.find((option) => option.value === selected) ?? options[2];
    const Icon = currentOption.icon;
    const nextIndex =
      (options.findIndex((option) => option.value === selected) + 1) %
      options.length;
    return (
      <button
        aria-label={`Theme: ${currentOption.label}. Activate ${options[nextIndex].label} theme.`}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border border-workspace-border bg-surface-low text-on-surface-variant transition-colors hover:bg-surface-high hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        )}
        onClick={() => selectTheme(options[nextIndex].value)}
        title={
          selected === "system"
            ? `System · Currently ${resolvedTheme === "dark" ? "Dark" : "Light"}`
            : currentOption.label
        }
        type="button"
      >
        <Icon aria-hidden="true" className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      aria-label="Theme"
      className={cn(
        "inline-flex rounded-md border border-workspace-border bg-surface-low p-0.5",
        className,
      )}
      role="group"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = selected === value;
        return (
          <button
            aria-label={`Use ${label} theme`}
            aria-pressed={active}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              active
                ? "bg-primary text-primary-foreground"
                : "text-on-surface-variant hover:bg-surface-high hover:text-on-surface",
            )}
            key={value}
            onClick={() => selectTheme(value)}
            title={
              value === "system"
                ? `System · Currently ${resolvedTheme === "dark" ? "Dark" : "Light"}`
                : label
            }
            type="button"
          >
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
