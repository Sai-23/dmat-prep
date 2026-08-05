import { describe, expect, it } from "vitest";

import {
  answerSubmissionSchema,
  practiceConfigSchema,
} from "./schemas";

describe("practice validation", () => {
  it("accepts a valid focused practice configuration", () => {
    expect(
      practiceConfigSchema.safeParse({
        module: "computer_science",
        questionType: "computer_science",
        topic: "Algorithms",
        difficulty: "medium",
        sourceType: "manual",
        quantity: 10,
        timingMode: "timed",
      }).success,
    ).toBe(true);
  });

  it("rejects oversized practice sessions", () => {
    expect(
      practiceConfigSchema.safeParse({
        module: "core",
        questionType: "any",
        difficulty: "any",
        sourceType: "any",
        quantity: 100,
        timingMode: "untimed",
      }).success,
    ).toBe(false);
  });

  it("rejects malformed answer identifiers", () => {
    expect(
      answerSubmissionSchema.safeParse({
        attemptId: "not-an-id",
        questionId: "not-an-id",
        optionId: "not-an-id",
        timeSpentSeconds: 12,
      }).success,
    ).toBe(false);
  });
});
