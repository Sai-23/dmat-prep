import { describe, expect, it } from "vitest";
import { generateValidatedFigureSequence } from "../generation";
import { createPracticeSnapshots, gradePracticeAnswer } from "./native";

describe("native practice snapshots", () => {
  it("removes figure answer identifiers from the browser snapshot", () => {
    const question = generateValidatedFigureSequence({ seed: "practice-figure", difficulty: "easy" });
    const result = createPracticeSnapshots({ id: "id", module: "core", questionType: "figure_sequence", topic: "Figure", subtopic: null, difficulty: "easy", questionText: "Next?", passage: null, code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 60, structuredData: { sequence: question.sequence, response: question.response }, metadata: { generation: question.metadata, correctAnswer: question.correctAnswer }, explanation: question.explanation, options: [], correctOptionId: null, sourceType: "generated" });
    expect(JSON.stringify(result.publicQuestion)).not.toContain("-correct");
    expect(gradePracticeAnswer({ kind: "two_stage_single_choice", optionIds: result.privateSnapshot.correctAnswer as [string, string] }, result.privateSnapshot)).toBe(true);
  });

  it("grades native assignments independently from browser state", () => {
    expect(gradePracticeAnswer({ kind: "symbol_assignment", values: { A: 4, B: 7 } }, { correctAnswer: { A: 4, B: 7 }, explanation: "", provenance: {} })).toBe(true);
    expect(gradePracticeAnswer({ kind: "symbol_assignment", values: { A: 4, B: 8 } }, { correctAnswer: { A: 4, B: 7 }, explanation: "", provenance: {} })).toBe(false);
  });
});
