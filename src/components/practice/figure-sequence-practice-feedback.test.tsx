import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { generateValidatedFigureSequence } from "../../lib/generation/figure-sequences";
import { FigureSequencePracticeFeedback } from "./figure-sequence-practice-feedback";

function fixture(difficulty: "easy" | "medium" | "hard") {
  return generateValidatedFigureSequence({
    seed: `figure-practice-feedback-${difficulty}`,
    difficulty,
    symbolCount: difficulty === "easy" ? 1 : difficulty === "medium" ? 3 : 4,
    maxAttempts: 5_000,
  });
}

function renderFeedback({
  difficulty = "medium",
  wrong = false,
  initiallyOpen = true,
  initialView = "step",
  initialStep = 0,
}: {
  difficulty?: "easy" | "medium" | "hard";
  wrong?: boolean;
  initiallyOpen?: boolean;
  initialView?: "step" | "all";
  initialStep?: number;
} = {}) {
  const question = fixture(difficulty);
  const selected = [...question.correctAnswer];
  if (wrong) {
    selected[0] = question.sequence.missingMatrices[0].candidates.find(
      (candidate) => candidate.id !== question.correctAnswer[0],
    )?.id ?? "";
  }
  return {
    question,
    html: renderToStaticMarkup(
      <FigureSequencePracticeFeedback
        correctAnswer={question.correctAnswer}
        initialStep={initialStep}
        initialView={initialView}
        initiallyOpen={initiallyOpen}
        isCorrect={!wrong}
        selectedAnswer={selected}
        sequence={question.sequence}
        trace={{ rules: question.structuredData.rules }}
      />,
    ),
  };
}

describe("FigureSequencePracticeFeedback", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "renders visual rule discovery for %s",
    (difficulty) => {
      const { html } = renderFeedback({ difficulty });
      expect(html).toContain("Track the");
      expect(html).toContain("Old position");
      expect(html).toContain("New position");
      expect(html).toContain("Rules found");
      expect(html).toContain('stroke-dasharray="5 4"');
      if (difficulty !== "easy") {
        expect(html).toContain('opacity="0.18"');
      }
      expect(html).toContain("Previous");
      expect(html).toContain("Next");
    },
  );

  it("shows actual movement and rotation changes for a high multi-symbol question", () => {
    const { html } = renderFeedback({ difficulty: "hard", initialView: "all" });
    expect(html).toContain("Position");
    expect(html).toContain("Orientation");
    expect(html).toContain("rotate");
    expect(html).toContain('aria-pressed="');
    expect(html).not.toContain("symbol-");
  });

  it("walks through both missing matrices and shows option images", () => {
    const question = fixture("medium");
    const finalStep = question.structuredData.rules.length + 1;
    const { html } = renderFeedback({ difficulty: "medium", wrong: true, initialStep: finalStep });
    expect(html).toContain("Predict missing matrix 2");
    expect(html).toContain("Apply the same rules one more time");
    expect(html).toContain('data-answer-comparison="figure-sequence"');
    expect(html).toContain("Your matrix 1");
    expect(html).toContain("Correct matrix 2");
    expect(html.match(/role="img"/g)?.length).toBeGreaterThanOrEqual(6);
    expect(html).not.toContain("candidate-1-");
    expect(html).not.toContain("candidate-2-");
  });

  it("supports Show all, touch-sized rule buttons, and responsive stacking", () => {
    const { html } = renderFeedback({ difficulty: "hard", initialView: "all" });
    expect(html).toContain('data-walkthrough-view="all"');
    expect(html).toContain("Show one step at a time");
    expect(html).toContain("min-h-10");
    expect(html).toContain("lg:grid-cols-");
    expect(html).toContain("motion-reduce:transition-none");
  });
});
