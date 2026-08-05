import { describe, expect, it } from "vitest";

import { isThemePreference, THEME_PREFERENCES } from "./theme";

describe("theme preferences", () => {
  it("supports Light, Dark, and System", () => {
    expect(THEME_PREFERENCES).toEqual(["light", "dark", "system"]);
  });

  it("rejects invalid persisted values", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});
