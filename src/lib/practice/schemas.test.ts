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

  it.each([
    { kind: "single_choice", optionId: "choice-a" },
    { kind: "symbol_assignment", values: { A: 2, B: 7 } },
    { kind: "two_stage_single_choice", optionIds: ["first", "second"] },
    { kind: "subject_answers", answers: { child1: "a", child2: "d" } },
  ])("accepts the native $kind response", (answer) => {
    expect(answerSubmissionSchema.safeParse({
      attemptId: "11111111-1111-4111-8111-111111111111",
      questionId: "22222222-2222-4222-8222-222222222222",
      answer,
    }).success).toBe(true);
  });
});
