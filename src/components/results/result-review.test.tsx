import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { MathematicalEquationStructuredData } from "@/lib/generation/mathematical-equations";
import type { ResultQuestion } from "@/lib/results/schemas";
import { ResultReview } from "./result-review";

vi.mock("@/app/learning/actions", () => ({
  toggleBookmarkAction: vi.fn(),
}));

const equation: MathematicalEquationStructuredData = {
  variables: ["A", "B"],
  domain: { minimum: 1, maximum: 20, integersOnly: true },
  dependencyModel: {
    family: "direct_chain",
    solveOrder: ["A", "B"],
    edges: [{ source: "A", target: "B" }],
  },
  equations: [
    {
      left: {
        kind: "operation",
        operator: "subtract",
        left: { kind: "constant", value: 5 },
        right: { kind: "variable", symbol: "A" },
      },
      right: { kind: "constant", value: 2 },
    },
    {
      left: {
        kind: "operation",
        operator: "divide",
        left: { kind: "variable", symbol: "B" },
        right: { kind: "constant", value: 3 },
      },
      right: { kind: "variable", symbol: "A" },
    },
  ],
};

function resultQuestion(answer: { A?: number; B?: number }): ResultQuestion {
  return {
    id: "equation-result",
    module: "core",
    questionType: "mathematical_equation",
    topic: "Mathematical Equations",
    subtopic: "Substitution",
    difficulty: "easy",
    questionText: "Find A and B.",
    passage: null,
    code: null,
    formula: null,
    structuredData: equation,
    response: { kind: "symbol_assignment", symbols: ["A", "B"] },
    options: [],
    sectionTitle: "Core",
    selectedOptionId: null,
    correctOptionId: "",
    explanation: "Dense legacy explanation must not render.",
    responseStatus: "answered",
    isCorrect: answer.A === 3 && answer.B === 9,
    markedForReview: false,
    isBookmarked: false,
    timeSpentSeconds: 42,
    answer: { kind: "symbol_assignment", values: answer },
    correctAnswer: { A: 3, B: 9 },
    explanationTrace: [
      { equationIndex: 0, targetSymbol: "A", knownSymbols: [] },
      { equationIndex: 1, targetSymbol: "B", knownSymbols: ["A"] },
    ],
  };
}

describe("completed Mathematical Equation result review", () => {
  it("fixes the structured-response footer bug and reuses the step walkthrough", () => {
    const html = renderToStaticMarkup(<ResultReview questions={[resultQuestion({ A: 3, B: 1 })]} />);

    expect(html).toContain('data-answer-review="mathematical-equation"');
    expect(html.match(/data-answer-review="mathematical-equation"/g)).toHaveLength(1);
    expect(html).toContain("1 of 2 values correct");
    expect(html).toContain("Variable A. Your answer 3. Correct answer 3. Correct.");
    expect(html).toContain("Variable B. Your answer 1. Correct answer 9. Incorrect.");
    expect(html).toContain("How to solve it");
    expect(html).toContain("Substitute known values");
    expect(html).toContain("Final answer");
    expect(html).not.toContain("Dense legacy explanation must not render.");
    expect(html).not.toContain("Your response:");
    expect(html).not.toContain("No answer");
    expect(html).not.toContain("Correct: Unavailable");
    expect(html).not.toContain('data-response-interface="equation-variable-values"');
  });

  it("shows an unanswered variable without collapsing the structured response", () => {
    const html = renderToStaticMarkup(<ResultReview questions={[resultQuestion({ A: 3 })]} />);
    expect(html).toContain("Variable B. Your answer not answered. Correct answer 9. Not answered.");
    expect(html).toContain('data-variable-result="unanswered"');
    expect(html).not.toContain("Your response: No answer");
  });
});
