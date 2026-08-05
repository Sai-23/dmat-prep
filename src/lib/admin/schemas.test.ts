import { describe, expect, it } from "vitest";

import { questionAuthoringSchema } from "./schemas";

const validQuestion = {
  module: "computer_science",
  questionType: "computer_science",
  subject: "CS",
  topic: "Algorithms",
  subtopic: "",
  difficulty: "medium",
  questionText: "Which algorithm has logarithmic search complexity?",
  passage: "",
  code: "",
  formula: "",
  structuredData: "",
  imageUrl: "",
  explanation: "Binary search halves the remaining search space at every step.",
  estimatedTimeSeconds: "60",
  sourceType: "manual",
  options: ["Linear search", "Binary search", "Bubble sort", "DFS"],
  correctOptionIndex: "1",
  intent: "review",
};

describe("question authoring validation", () => {
  it("accepts a complete question", () => {
    expect(questionAuthoringSchema.safeParse(validQuestion).success).toBe(true);
  });

  it("enforces module and question-type consistency", () => {
    expect(
      questionAuthoringSchema.safeParse({
        ...validQuestion,
        module: "core",
      }).success,
    ).toBe(false);
  });

  it("requires four unique options", () => {
    expect(
      questionAuthoringSchema.safeParse({
        ...validQuestion,
        options: ["Same", "Same", "Third", "Fourth"],
      }).success,
    ).toBe(false);
  });
});
