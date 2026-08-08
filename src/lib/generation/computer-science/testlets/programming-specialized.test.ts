import { describe, expect, it } from "vitest";
import { generateOopSubjectTestlet, generateRecursionSubjectTestlet, generateValidatedOopSubjectTestlet, generateValidatedRecursionSubjectTestlet, solveOopState, solveRecursion } from "./programming-specialized";
import { validateSubjectTestlet } from "./validation";

describe("CS3.6 recursion generator", () => {
  it("independently evaluates return value, calls, order, and depth", () => {
    expect(solveRecursion({ kind: "reduce_by_two", start: 5 })).toEqual({ returnValue: 9, callCount: 4, maxDepth: 4, callOrder: [5, 3, 1, 0] });
    expect(solveRecursion({ kind: "array_sum", start: 0, values: [2, 4, 3] })).toEqual({ returnValue: 9, callCount: 4, maxDepth: 4, callOrder: [0, 1, 2, 3] });
  });

  it("reproduces validated and structurally varied recursion testlets", () => {
    const kinds = new Set<string>();
    for (let index = 0; index < 80; index += 1) {
      const testlet = generateRecursionSubjectTestlet({ seed: `rec-${index}`, difficulty: "medium" });
      expect(validateSubjectTestlet(testlet).valid).toBe(true);
      expect(testlet.questions).toHaveLength(4);
      kinds.add(testlet.subtopic);
    }
    expect(kinds.size).toBe(6);
    expect(generateValidatedRecursionSubjectTestlet({ seed: "repeat", difficulty: "hard" }).metadata.fingerprint).toBe(generateValidatedRecursionSubjectTestlet({ seed: "repeat", difficulty: "hard" }).metadata.fingerprint);
  });
});

describe("CS3.6 basic OOP generator", () => {
  it("interprets method effects, overriding, and independent object state", () => {
    expect(solveOopState({ kind: "counter", initial: 3, delta: 2, calls: 3 }).finalValue).toBe(9);
    expect(solveOopState({ kind: "inherited_counter", initial: 3, delta: 2, calls: 2 }).methodResults).toEqual([6, 9]);
    expect(solveOopState({ kind: "paired_account", initial: 5, delta: 2, calls: 2 }).objectValues).toEqual([9, 5]);
  });

  it("reproduces validated and structurally varied OOP testlets", () => {
    const kinds = new Set<string>();
    for (let index = 0; index < 80; index += 1) {
      const testlet = generateOopSubjectTestlet({ seed: `oop-${index}`, difficulty: "medium" });
      expect(validateSubjectTestlet(testlet).valid).toBe(true);
      kinds.add(testlet.subtopic);
    }
    expect(kinds.size).toBe(6);
    expect(generateValidatedOopSubjectTestlet({ seed: "repeat", difficulty: "hard" }).metadata.fingerprint).toBe(generateValidatedOopSubjectTestlet({ seed: "repeat", difficulty: "hard" }).metadata.fingerprint);
  });
});
