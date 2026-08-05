import { describe, expect, it } from "vitest";

import {
  adminNavigation,
  navigationForRoles,
  reviewerNavigation,
} from "./navigation";

describe("navigationForRoles", () => {
  it("shows reviewers only the shared console and review features", () => {
    expect(
      navigationForRoles(reviewerNavigation, ["reviewer"]).map(
        (item) => item.label,
      ),
    ).toEqual(["Reviewer Dashboard", "Review Queue"]);
  });

  it("shows admins every administration feature", () => {
    expect(navigationForRoles(adminNavigation, ["admin"])).toEqual(
      adminNavigation,
    );
  });

  it("does not expose role-restricted administration links to students", () => {
    expect(navigationForRoles(adminNavigation, ["student"])).toEqual([]);
  });
});
