import { describe, expect, it } from "vitest";

import {
  equationGenerationRequestSchema,
  generatedEquationSaveSchema,
  generatedFigureSaveSchema,
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

});
