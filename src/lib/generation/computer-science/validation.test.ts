import { describe, expect, it } from "vitest";

import { fingerprintComputerScienceSubjectUnit } from "./fingerprint";
import type { ComputerScienceSubjectUnit } from "./types";
import { validateComputerScienceSubjectUnit } from "./validation";

function validUnit(): ComputerScienceSubjectUnit {
  return {
    schemaVersion: 1,
    module: "computer_science",
    subject: "computer_science",
    topic: "Algorithm tracing",
    stimulus: {
      id: "stimulus-1",
      title: "Trace the program",
      blocks: [
        { kind: "text", text: "Use the following pseudocode for both questions." },
        { kind: "code", language: "text", code: "x <- 2\nx <- x + 3" },
      ],
    },
    questions: [
      {
        id: "question-1",
        topic: "Algorithm tracing",
        difficulty: "easy",
        prompt: "What is the final value of x?",
        blocks: [],
        options: [
          { id: "q1-a", label: "A", content: "2" },
          { id: "q1-b", label: "B", content: "3" },
          { id: "q1-c", label: "C", content: "5" },
          { id: "q1-d", label: "D", content: "6" },
        ],
        correctOptionId: "q1-c",
        explanation: "Adding three to two produces five.",
        estimatedSolveTimeSeconds: 30,
      },
      {
        id: "question-2",
        topic: "Assignment",
        difficulty: "easy",
        prompt: "How many assignments are executed?",
        blocks: [],
        options: [
          { id: "q2-a", label: "A", content: 1 },
          { id: "q2-b", label: "B", content: 2 },
          { id: "q2-c", label: "C", content: 3 },
          { id: "q2-d", label: "D", content: 4 },
        ],
        correctOptionId: "q2-b",
        explanation: "Each line assigns a value once.",
        estimatedSolveTimeSeconds: 25,
      },
    ],
  };
}

describe("Computer Science subject-unit architecture", () => {
  it("accepts one stimulus shared by multiple four-option questions", () => {
    const result = validateComputerScienceSubjectUnit(validUnit());
    expect(result).toMatchObject({ valid: true });
    if (result.valid) {
      expect(result.solution).toEqual({ questionCount: 2, correctOptionIds: ["q1-c", "q2-b"] });
    }
  });

  it("accepts all supported stimulus block families", () => {
    const unit = validUnit();
    unit.stimulus.blocks.push(
      { kind: "formula", expression: "T(n) = n + 1" },
      { kind: "table", data: [["n", "T(n)"], [2, 3]] },
      { kind: "diagram", data: { nodes: ["start", "end"] } },
    );
    expect(validateComputerScienceSubjectUnit(unit).valid).toBe(true);
  });

  it("rejects anything other than exactly four options", () => {
    const unit = validUnit() as unknown as { questions: Array<{ options: unknown[] }> };
    unit.questions[0].options.pop();
    expect(validateComputerScienceSubjectUnit(unit as unknown as ComputerScienceSubjectUnit).valid).toBe(false);
  });

  it("rejects duplicate option identities or an absent correct option", () => {
    const duplicate = validUnit();
    duplicate.questions[0].options[1].id = duplicate.questions[0].options[0].id;
    expect(validateComputerScienceSubjectUnit(duplicate).valid).toBe(false);
    const absent = validUnit();
    absent.questions[0].correctOptionId = "not-present";
    expect(validateComputerScienceSubjectUnit(absent).valid).toBe(false);
  });

  it("rejects duplicate question identities and empty stimuli", () => {
    const duplicate = validUnit();
    duplicate.questions[1].id = duplicate.questions[0].id;
    expect(validateComputerScienceSubjectUnit(duplicate).valid).toBe(false);
    const empty = validUnit();
    empty.stimulus.blocks = [];
    expect(validateComputerScienceSubjectUnit(empty).valid).toBe(false);
  });

  it("fingerprints semantics rather than generated IDs and option labels", () => {
    const first = validUnit();
    const second = structuredClone(first);
    second.stimulus.id = "renamed-stimulus";
    second.questions[0].id = "renamed-question";
    second.questions[0].options.forEach((option, index) => {
      option.id = `renamed-${index}`;
      option.label = String(index + 1);
    });
    second.questions[0].correctOptionId = "renamed-2";
    expect(fingerprintComputerScienceSubjectUnit(second)).toBe(fingerprintComputerScienceSubjectUnit(first));
    second.questions[0].options[2].content = "changed";
    expect(fingerprintComputerScienceSubjectUnit(second)).not.toBe(fingerprintComputerScienceSubjectUnit(first));
  });
});
