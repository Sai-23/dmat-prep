import { describe, expect, it } from "vitest";

import { seededShuffle } from "./randomization";

describe("seeded test randomization", () => {
  it("returns the same order for the same attempt seed", () => {
    const values = ["a", "b", "c", "d", "e"];
    expect(seededShuffle(values, "attempt-1")).toEqual(
      seededShuffle(values, "attempt-1"),
    );
  });

  it("does not mutate the source array", () => {
    const values = ["a", "b", "c"];
    seededShuffle(values, "seed");
    expect(values).toEqual(["a", "b", "c"]);
  });
});
