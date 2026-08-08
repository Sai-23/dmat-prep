import { describe, expect, it } from "vitest";

import { practiceTargetPaceSeconds } from "./timing";

describe("practice timing", () => {
  it("normalizes the stored calibrated pace to whole positive seconds", () => {
    expect(practiceTargetPaceSeconds(89.6)).toBe(90);
    expect(practiceTargetPaceSeconds(0)).toBe(1);
  });
});
