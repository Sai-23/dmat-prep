import { describe, expect, it } from "vitest";

import {
  equationGenerationRequestSchema,
  generatedEquationSaveSchema,
  generatedFigureSaveSchema,
  generatedComputerScienceSaveSchema,
  generatedLatinSaveSchema,
} from "./generation-schemas";

describe("admin equation generation schemas", () => {
  it("normalizes an optional empty seed", () => {
    expect(
      equationGenerationRequestSchema.parse({
        difficulty: "medium",
        quantity: "10",
        seed: " ",
      }),
    ).toEqual({ difficulty: "medium", quantity: 10, seed: null });
  });

  it("enforces the synchronous preview batch limit", () => {
    expect(
      equationGenerationRequestSchema.safeParse({
        difficulty: "easy",
        quantity: 21,
      }).success,
    ).toBe(false);
  });

  it("rejects malformed save provenance", () => {
    expect(
      generatedEquationSaveSchema.safeParse({
        seed: "seed",
        difficulty: "hard",
        attemptCount: 1,
        fingerprint: "untrusted",
      }).success,
    ).toBe(false);
  });

  it("accepts valid Latin-square provenance", () => {
    expect(
      generatedLatinSaveSchema.safeParse({
        seed: "latin-seed",
        difficulty: "hard",
        attemptCount: 42,
        fingerprint: "latin-square:v1:0123456789abcdef",
      }).success,
    ).toBe(true);
  });

  it("accepts valid Figure Sequence provenance", () => {
    expect(
      generatedFigureSaveSchema.safeParse({
        seed: "figure-seed",
        difficulty: "medium",
        attemptCount: 417,
        fingerprint: "figure-sequence:v1:0123456789abcdef",
      }).success,
    ).toBe(true);
  });

  it("rejects a Figure Sequence fingerprint in another namespace", () => {
    expect(
      generatedFigureSaveSchema.safeParse({
        seed: "figure-seed",
        difficulty: "medium",
        attemptCount: 1,
        fingerprint: "latin-square:v1:0123456789abcdef",
      }).success,
    ).toBe(false);
  });

  it("accepts valid Boolean-logic subject-unit provenance", () => {
    expect(generatedComputerScienceSaveSchema.safeParse({
      family: "boolean_truth_tables",
      targetSize: 6,
      seed: "boolean-seed",
      difficulty: "hard",
      attemptCount: 8,
      fingerprint: "computer-science-testlet:v1:0123456789abcdef",
    }).success).toBe(true);
  });

  it("accepts valid combinational-circuit provenance", () => {
    expect(generatedComputerScienceSaveSchema.safeParse({
      family: "combinational_circuits",
      targetSize: 8,
      seed: "circuit-seed",
      difficulty: "medium",
      attemptCount: 3,
      fingerprint: "computer-science-testlet:v1:0123456789abcdef",
    }).success).toBe(true);
  });

  it("accepts valid Programming testlet provenance", () => {
    expect(generatedComputerScienceSaveSchema.safeParse({ family: "programming_trace", targetSize: 4, seed: "programming-seed", difficulty: "easy", attemptCount: 1, fingerprint: "computer-science-testlet:v1:0123456789abcdef" }).success).toBe(true);
  });
});
