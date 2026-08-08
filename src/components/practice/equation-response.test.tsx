import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PracticeQuestion } from "../../lib/practice/schemas";
import { NativePracticeResponse, normalizeEquationInput } from "./native-practice-response";
import { PracticeAnswerFeedback } from "./practice-answer-feedback";

const question: PracticeQuestion = {
  id: "equation", module: "core", questionType: "mathematical_equation", topic: "Equations",
  subtopic: null, difficulty: "easy", questionText: "Find the values", passage: null,
  code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 55,
  structuredData: {
    variables: ["A", "B"], domain: { minimum: 1, maximum: 20, integersOnly: true },
    equations: [
      { left: { kind: "variable", symbol: "A" }, right: { kind: "operation", operator: "multiply", left: { kind: "constant", value: 2 }, right: { kind: "variable", symbol: "B" } } },
      { left: { kind: "operation", operator: "multiply", left: { kind: "constant", value: 2 }, right: { kind: "variable", symbol: "B" } }, right: { kind: "constant", value: 12 } },
    ],
  },
  response: { kind: "symbol_assignment", symbols: ["A", "B"] }, options: [],
};

describe("mathematical-equation response UX", () => {
  it("starts with empty spinner-free numeric-keyboard fields and no correctness state", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={null} disabled={false} onChange={() => undefined} question={question} />);
    expect(html.match(/value=""/g)).toHaveLength(2);
    expect(html).toContain('type="text"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("border-success");
    expect(html).not.toContain("border-error");
  });

  it("normalizes leading zeros and safely validates the official 1–20 integer domain", () => {
    expect(normalizeEquationInput("6")).toEqual({ raw: "6", value: 6, valid: true });
    expect(normalizeEquationInput("06")).toEqual({ raw: "6", value: 6, valid: true });
    expect(normalizeEquationInput("12")).toEqual({ raw: "12", value: 12, valid: true });
    expect(normalizeEquationInput("")).toEqual({ raw: "", value: null, valid: true });
    expect(normalizeEquationInput("0").value).toBeNull();
    expect(normalizeEquationInput("21").value).toBeNull();
    expect(normalizeEquationInput("1.5").value).toBeNull();
    expect(normalizeEquationInput("-2").value).toBeNull();
  });

  it("renders human-readable, per-variable feedback without response JSON", () => {
    const html = renderToStaticMarkup(<PracticeAnswerFeedback answer={{ kind: "symbol_assignment", values: { A: 6, B: 6 } }} correctAnswer={{ A: 12, B: 6 }} question={question} />);
    expect(html).toContain("A = 6");
    expect(html).toContain("A = 12");
    expect(html).toContain("B = 6");
    expect(html).toContain('aria-label="Incorrect"');
    expect(html).toContain('aria-label="Correct"');
    expect(html).not.toContain("symbol_assignment");
    expect(html).not.toContain("&quot;values&quot;");
    expect(html).not.toContain("{&quot;");
  });

  it("does not reveal correct values in the active response component", () => {
    const html = renderToStaticMarkup(<NativePracticeResponse answer={{ kind: "symbol_assignment", values: { A: 6 } }} disabled={false} onChange={() => undefined} question={question} />);
    expect(html).not.toContain("A = 12");
    expect(html).not.toContain("Correct value");
  });
});
