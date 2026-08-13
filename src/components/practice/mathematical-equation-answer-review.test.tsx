import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathematicalEquationAnswerReview } from "./mathematical-equation-answer-review";

function render(selectedAnswer: Partial<Record<string, number>>, correctAnswer: unknown = { A: 3, B: 9 }) {
  return renderToStaticMarkup(
    <MathematicalEquationAnswerReview
      correctAnswer={correctAnswer}
      selectedAnswer={selectedAnswer}
      symbols={["A", "B"]}
    />,
  );
}

describe("MathematicalEquationAnswerReview", () => {
  it("compares the exact partially-correct response row by row", () => {
    const html = render({ A: 3, B: 1 });
    expect(html).toContain("1 of 2 values correct");
    expect(html).toContain("Variable A. Your answer 3. Correct answer 3. Correct.");
    expect(html).toContain("Variable B. Your answer 1. Correct answer 9. Incorrect.");
    expect(html).toContain('data-variable-result="correct"');
    expect(html).toContain('data-variable-result="incorrect"');
    expect(html).not.toContain("No answer");
    expect(html).not.toContain("Correct: Unavailable");
  });

  it("summarizes an all-correct response", () => {
    const html = render({ A: 3, B: 9 });
    expect(html).toContain("All values correct");
    expect(html.match(/data-variable-result="correct"/g)).toHaveLength(2);
    expect(html).not.toContain("Incorrect");
  });

  it("summarizes an all-incorrect response", () => {
    const html = render({ A: 7, B: 1 });
    expect(html).toContain("0 of 2 values correct");
    expect(html.match(/data-variable-result="incorrect"/g)).toHaveLength(2);
  });

  it("treats one missing variable as unanswered instead of losing the structured response", () => {
    const html = render({ A: 3 });
    expect(html).toContain("1 of 2 values correct");
    expect(html).toContain("Variable B. Your answer not answered. Correct answer 9. Not answered.");
    expect(html).toContain('data-variable-result="unanswered"');
    expect(html).toContain("—");
    expect(html).not.toContain("No answer");
  });

  it("uses a neutral safe message for a corrupt legacy answer payload", () => {
    const html = render({ A: 3 }, null);
    expect(html).toContain("Answer details unavailable for this attempt.");
    expect(html).not.toContain("Correct: Unavailable");
    expect(html).not.toContain("No answer");
  });
});
