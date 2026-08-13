import { describe, expect, it } from "vitest";

import { adminTestBuilderSchema } from "./test-schemas";

const questionId = "11111111-1111-4111-8111-111111111111";

function validInput() {
  return {
    title: "Core Mini Mock",
    description: "A balanced assessment.",
    testType: "mini_mock",
    module: "core",
    instructions: "Answer every question before time expires.",
    isPremium: false,
    randomizeQuestions: true,
    randomizeOptions: true,
    intent: "draft",
    sections: [
      {
        title: "Equations",
        module: "core",
        sectionType: "mathematical_equation",
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
      title: "More equations",
      module: "core",
      sectionType: "mathematical_equation",
      durationSeconds: 1200,
      questionIds: [questionId],
    });
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("rejects an unsupported test module", () => {
    const input = validInput();
    input.module = "unsupported";
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });

  it("requires at least one question in every section", () => {
    const input = validInput();
    input.sections[0].questionIds = [];
    expect(adminTestBuilderSchema.safeParse(input).success).toBe(false);
  });
});
