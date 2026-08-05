import { describe, expect, it } from "vitest";

import { resolveDisplayName } from "./display-name";

describe("resolveDisplayName", () => {
  it("prefers the profile display name", () => {
    expect(
      resolveDisplayName({
        profileDisplayName: "Ada",
        profileFullName: "Ada Lovelace",
        email: "ada@example.com",
      }),
    ).toBe("Ada");
  });

  it("falls back through profile, auth metadata, and email", () => {
    expect(
      resolveDisplayName({
        metadataFullName: "Grace Hopper",
        email: "grace@example.com",
      }),
    ).toBe("Grace Hopper");
    expect(resolveDisplayName({ email: "alan@example.com" })).toBe("alan");
    expect(resolveDisplayName({})).toBe("Student");
  });
});
