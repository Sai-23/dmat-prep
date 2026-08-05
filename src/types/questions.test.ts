import { describe, expect, it } from "vitest";

import { questionSchema } from "./questions";

describe("questionSchema", () => {
  it("accepts a valid question payload", () => {
    const result = questionSchema.safeParse({
      id: "1d25ac88-0083-4b72-b510-8090e1314982",
      module: "computer_science",
      questionType: "computer_science",
      topic: "Programming and Algorithms",
      difficulty: "medium",
      questionText: "What is the output of the algorithm?",
      options: [
        {
          id: "7c5b4c67-e7a6-4307-b828-ff1110b5ef5b",
          label: "A",
          content: "O(n)",
        },
        {
          id: "d95873ce-6039-4d8c-832f-1971d87d13b8",
          label: "B",
          content: "O(log n)",
        },
        {
          id: "f6396fbf-e283-44f1-8c55-c8f56b005e2d",
          label: "C",
          content: "O(n log n)",
        },
        {
          id: "74f7db4f-2d91-4a10-a305-fef3b48fbe1d",
          label: "D",
          content: "O(1)",
        },
      ],
      correctOptionId: "7c5b4c67-e7a6-4307-b828-ff1110b5ef5b",
      explanation: "Tracing the loop shows one pass through all n elements.",
      estimatedTimeSeconds: 75,
      sourceType: "manual",
      verificationStatus: "draft",
      publicationStatus: "draft",
      version: 1,
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });

  it("rejects payloads without exactly four options", () => {
    const result = questionSchema.safeParse({
      id: "1d25ac88-0083-4b72-b510-8090e1314982",
      module: "core",
      questionType: "latin_square",
      topic: "Latin Squares",
      difficulty: "easy",
      questionText: "Fill the missing symbol.",
      options: [
        {
          id: "7c5b4c67-e7a6-4307-b828-ff1110b5ef5b",
          label: "A",
          content: "1",
        },
      ],
      correctOptionId: "7c5b4c67-e7a6-4307-b828-ff1110b5ef5b",
      explanation: "The row and column constraints leave a single symbol.",
      estimatedTimeSeconds: 60,
      sourceType: "generated",
      verificationStatus: "approved",
      publicationStatus: "published",
      version: 1,
      createdAt: "2026-08-04T00:00:00.000Z",
      updatedAt: "2026-08-04T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
