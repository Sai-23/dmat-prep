import { describe, expect, it } from "vitest";

import { canonicalize, createFingerprint } from "./fingerprint";

describe("semantic fingerprints", () => {
  it("ignores object key insertion order", () => {
    expect(canonicalize({ b: 2, a: { d: 4, c: 3 } })).toBe(
      canonicalize({ a: { c: 3, d: 4 }, b: 2 }),
    );
  });

  it("preserves meaningful array order and namespace", () => {
    expect(createFingerprint("equation", { edges: ["A", "B"] })).not.toBe(
      createFingerprint("equation", { edges: ["B", "A"] }),
    );
    expect(createFingerprint("equation", { value: 1 })).not.toBe(
      createFingerprint("latin", { value: 1 }),
    );
  });
});

