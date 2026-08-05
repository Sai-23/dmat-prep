import { describe, expect, it } from "vitest";

import { hasAnyRole, hasRole, isAdmin, isReviewer } from "./roles";

describe("role helpers", () => {
  it("detects matching roles", () => {
    expect(hasRole(["student", "admin"], "admin")).toBe(true);
    expect(hasAnyRole(["student"], ["reviewer", "admin"])).toBe(false);
  });

  it("applies admin and reviewer shortcuts", () => {
    expect(isAdmin(["admin"])).toBe(true);
    expect(isReviewer(["reviewer"])).toBe(true);
    expect(isReviewer(["admin"])).toBe(true);
    expect(isReviewer(["student"])).toBe(false);
  });
});
