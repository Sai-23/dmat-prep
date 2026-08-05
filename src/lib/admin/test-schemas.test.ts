import { describe, expect, it } from "vitest";

import { adminTestBuilderSchema } from "./test-schemas";

const questionId = "11111111-1111-4111-8111-111111111111";

function validInput() {
  return {
    title: "Computer Science Mini Mock",
    description: "A balanced assessment.",
    testType: "mini_mock",
    module: "computer_science",
    instructions: "Answer every question before time expires.",
    isPremium: false,
    randomizeQuestions: true,
    randomizeOptions: true,
    intent: "draft",
    sections: [
      {
        title: "Algorithms",
        module: "computer_science",
        durationSeconds: 1800,
        questionIds: [questionId],
      },
    ],
  };
}

describe("adminTestBuilderSchema", () => {
  it("accepts a complete test structure", () => {
    expect(adminTestBuilderSchema.safeParse(validInput()).success).toBe(true);
  });

  it("rejects duplicate questions across sections", () => {
    const input = validInput();
    input.sections.push({
      title: "Programming",
      module: "computer_science",
      durationSeconds: 1200,
      questionIds: [questionId],
    });
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("rejects a section that conflicts with the test module", () => {
    const input = validInput();
    input.sections[0].module = "core";
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("requires at least one question in every section", () => {
    const input = validInput();
    input.sections[0].questionIds = [];
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });
});
