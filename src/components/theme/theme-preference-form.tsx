"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { saveThemePreferenceAction } from "@/app/auth/actions";
import type { ThemePreference } from "@/lib/theme";

const preferences = [
  {
    value: "light",
    label: "Light",
    description: "Warm technical paper surfaces for bright environments.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "High-focus IDE surfaces for reduced-light study.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow this device’s current appearance setting.",
    icon: Monitor,
  },
] satisfies Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}>;

const subscribeToHydration = () => () => undefined;

export function ThemePreferenceForm() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = mounted ? theme ?? "system" : "system";

  const choose = (preference: ThemePreference) => {
    setTheme(preference);
    setMessage(null);
    startTransition(async () => {
      const result = await saveThemePreferenceAction(preference);
      if (result.error) {
        setMessage(
          "Theme changed on this device, but the profile preference could not be saved.",
        );
      } else if (result.saved) {
        setMessage("Appearance preference saved.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {preferences.map(({ value, label, description, icon: Icon }) => {
          const active = selected === value;
          return (
            <button
              aria-label={`Use ${label} theme`}
              aria-pressed={active}
              className={[
                "relative min-h-28 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                active
                  ? "border-primary bg-primary-muted"
                  : "border-workspace-border bg-surface-lowest hover:bg-surface-low",
              ].join(" ")}
              disabled={pending}
              key={value}
              onClick={() => choose(value)}
              type="button"
            >
              <Icon
                aria-hidden="true"
                className={active ? "h-5 w-5 text-primary" : "h-5 w-5"}
              />
              <span className="mt-3 block text-sm font-semibold">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {description}
              </span>
              {active ? (
                <Check
                  aria-hidden="true"
                  className="absolute right-3 top-3 h-4 w-4 text-primary"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Use the selected appearance throughout the public website, practice
        workspace, mock tests, and admin tools.
      </p>
      {message ? (
        <p aria-live="polite" className="text-xs text-on-surface-variant">
          {message}
        </p>
      ) : null}
    </div>
  );
}
