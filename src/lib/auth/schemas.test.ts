import { describe, expect, it } from "vitest";

import { registerSchema, safeRedirectPath } from "./schemas";

describe("auth schemas", () => {
  it("requires matching, reasonably strong passwords", () => {
    expect(
      registerSchema.safeParse({
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        password: "numbers123",
        confirmPassword: "different123",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid registration", () => {
    expect(
      registerSchema.safeParse({
        fullName: "Ada Lovelace",
        email: "ada@example.com",
        password: "numbers123",
        confirmPassword: "numbers123",
      }).success,
    ).toBe(true);
  });

  it("only accepts local redirect paths", () => {
    expect(safeRedirectPath("/practice?mode=timed")).toBe("/practice?mode=timed");
    expect(safeRedirectPath("https://example.com")).toBe("/dashboard");
    expect(safeRedirectPath("//example.com")).toBe("/dashboard");
    expect(safeRedirectPath("/login?next=/tests")).toBe("/dashboard");
  });
});
