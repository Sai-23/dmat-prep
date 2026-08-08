import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FigureSequenceRenderer } from "../questions/figure-sequence-renderer";
import { generateValidatedFigureSequence } from "../../lib/generation";
import type { PracticeQuestion } from "../../lib/practice/schemas";
import { PracticeAnswerFeedback } from "./practice-answer-feedback";

const generated = generateValidatedFigureSequence({ seed: "figure-response-ui", difficulty: "easy" });
const sequence = generated.sequence;
const first = sequence.missingMatrices[0];
const second = sequence.missingMatrices[1];
const selected = {
  [first.sequenceIndex]: first.candidates[0].id,
  [second.sequenceIndex]: second.candidates[0].id,
};
const independentlyGraded = {
  [first.sequenceIndex]: first.candidates[1].id,
  [second.sequenceIndex]: second.candidates[0].id,
};

function renderFigure(revealCorrectness = false) {
  return renderToStaticMarkup(
    <FigureSequenceRenderer
      correct={independentlyGraded}
      revealCorrectness={revealCorrectness}
      selected={selected}
      sequence={sequence}
    />,
  );
}

describe("figure-sequence response states", () => {
  it("keeps unselected candidates neutral", () => {
    const html = renderToStaticMarkup(<FigureSequenceRenderer sequence={sequence} />);
    expect(html).toContain('data-candidate-state="neutral"');
    expect(html).not.toContain('data-candidate-state="correct"');
    expect(html).not.toContain('data-candidate-state="incorrect"');
  });

  it("uses only the primary selected state before submission", () => {
    const html = renderFigure(false);
    expect(html.match(/data-candidate-state="selected"/g)).toHaveLength(2);
    expect(html).toContain("border-primary");
    expect(html).not.toContain('data-candidate-state="correct"');
    expect(html).not.toContain('data-candidate-state="incorrect"');
    expect(html).not.toContain("Correct answer");
    expect(html).not.toContain("Your answer is incorrect");
  });

  it("grades the two missing matrices independently after submission", () => {
    const html = renderFigure(true);
    expect(html.match(/data-candidate-state="incorrect"/g)).toHaveLength(1);
    expect(html.match(/data-candidate-state="correct"/g)).toHaveLength(2);
    expect(html).toContain("border-error");
    expect(html).toContain("border-success");
    expect(html).toContain("Your answer is incorrect");
    expect(html).toContain("Correct answer");
  });

  it("renders labels and the original matrix SVGs without raw candidate IDs", () => {
    const question: PracticeQuestion = {
      id: "figure", module: "core", questionType: "figure_sequence", topic: "Figures",
      subtopic: null, difficulty: "easy", questionText: "Continue", passage: null,
      code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 60,
      structuredData: sequence, response: { kind: "two_stage_single_choice" }, options: [],
    };
    const selectedIds: [string, string] = [selected[first.sequenceIndex], selected[second.sequenceIndex]];
    const correctIds = [independentlyGraded[first.sequenceIndex], independentlyGraded[second.sequenceIndex]];
    const html = renderToStaticMarkup(<PracticeAnswerFeedback answer={{ kind: "two_stage_single_choice", optionIds: selectedIds }} correctAnswer={correctIds} question={question} />);
    expect(html).toContain("Your answer");
    expect(html).toContain("Correct answer");
    expect(html).toContain("<svg");
    for (const id of [...selectedIds, ...correctIds]) expect(html).not.toContain(id);
    expect(html).not.toContain("two_stage_single_choice");
    expect(html).not.toContain("optionIds");
  });
});
