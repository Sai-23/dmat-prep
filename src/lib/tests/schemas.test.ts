import { describe, expect, it } from "vitest";

import { saveTestResponseSchema, submitTestSchema } from "./schemas";

describe("test attempt validation", () => {
  const id = "10000000-0000-4000-8000-000000000001";

  it("accepts a valid saved response", () => {
    expect(
      saveTestResponseSchema.safeParse({
        attemptId: id,
        questionId: "20000000-0000-4000-8000-000000000002",
        selectedOptionId: "30000000-0000-4000-8000-000000000003",
        markedForReview: true,
        timeSpentSeconds: 45,
      }).success,
    ).toBe(true);
  });

  it("allows an unanswered question to be marked for review", () => {
    expect(
      saveTestResponseSchema.safeParse({
        attemptId: id,
        questionId: "20000000-0000-4000-8000-000000000002",
        selectedOptionId: null,
        markedForReview: true,
        timeSpentSeconds: 12,
      }).success,
    ).toBe(true);
  });

  it("rejects malformed submission IDs", () => {
    expect(
      submitTestSchema.safeParse({
        attemptId: "invalid",
        autoSubmitted: false,
      }).success,
    ).toBe(false);
  });
});
