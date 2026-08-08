import { describe, expect, it } from "vitest";

import { hashSeed, SeededRandom } from "./random";

describe("SeededRandom", () => {
  it("replays the same stream for the same seed", () => {
    const first = new SeededRandom("equation:v1:42");
    const second = new SeededRandom("equation:v1:42");
    expect(Array.from({ length: 20 }, () => first.next())).toEqual(
      Array.from({ length: 20 }, () => second.next()),
    );
  });

  it("has a stable known sequence", () => {
    const random = new SeededRandom("dmat-known-vector");
    expect(Array.from({ length: 5 }, () => random.next())).toEqual([
      0.850830300943926,
      0.863955146400258,
      0.8779738817829639,
      0.610415760660544,
      0.15708120330236852,
    ]);
  });

  it("keeps inclusive integer results within bounds", () => {
    const random = new SeededRandom("bounds");
    const values = Array.from({ length: 5_000 }, () => random.integer(1, 20));
    expect(values.every((value) => value >= 1 && value <= 20)).toBe(true);
    expect(new Set(values)).toEqual(new Set(Array.from({ length: 20 }, (_, i) => i + 1)));
  });

  it("shuffles without mutating the input", () => {
    const source = ["A", "B", "C", "D", "E"];
    const first = new SeededRandom("latin").shuffle(source);
    const second = new SeededRandom("latin").shuffle(source);
    expect(first).toEqual(second);
    expect(source).toEqual(["A", "B", "C", "D", "E"]);
  });

  it("creates stable independent namespace streams", () => {
    const root = new SeededRandom("figure");
    expect(root.fork("movement").next()).toBe(
      new SeededRandom("figure").fork("movement").next(),
    );
    expect(root.fork("movement").next()).not.toBe(root.fork("colour").next());
  });

  it("rejects invalid seeds, ranges, and probabilities", () => {
    expect(() => hashSeed("   ")).toThrow(/non-empty/);
    const random = new SeededRandom("errors");
    expect(() => random.integer(2, 1)).toThrow(RangeError);
    expect(() => random.integer(0.1, 2)).toThrow(RangeError);
    expect(() => random.boolean(1.1)).toThrow(RangeError);
    expect(() => random.pick([])).toThrow(RangeError);
  });
});
