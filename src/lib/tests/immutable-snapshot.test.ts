import { describe, expect, it } from "vitest";

import { createPracticeSnapshots, gradePracticeAnswer } from "../practice/native";

describe("immutable mock question snapshots", () => {
  it("keeps the answer key out of the browser snapshot", () => {
    const snapshot = createPracticeSnapshots({
      id: "question", module: "core", questionType: "mathematical_equation",
      topic: "Equations", subtopic: null, difficulty: "easy", questionText: "Choose.",
      passage: null, code: null, formula: null, tableData: null, imageUrl: null,
      estimatedTimeSeconds: 60, structuredData: null, metadata: null,
      explanation: "Verified explanation", options: [
        { id: "a", label: "A", content: "First" }, { id: "b", label: "B", content: "Second" },
        { id: "c", label: "C", content: "Third" }, { id: "d", label: "D", content: "Fourth" },
      ], correctOptionId: "b", sourceType: "manual",
    });
    expect(JSON.stringify(snapshot.publicQuestion)).not.toContain("Verified explanation");
    expect(JSON.stringify(snapshot.publicQuestion)).not.toContain("correctAnswer");
    expect(snapshot.privateSnapshot.correctAnswer).toBe("b");
  });

  it("grades from the frozen answer after the source answer is edited", () => {
    const privateSnapshot = { correctAnswer: "old-answer", explanation: "Frozen", provenance: {} };
    const editedLiveAnswer = "new-answer";
    expect(editedLiveAnswer).not.toBe(privateSnapshot.correctAnswer);
    expect(gradePracticeAnswer({ kind: "single_choice", optionId: "old-answer" }, privateSnapshot)).toBe(true);
    expect(gradePracticeAnswer({ kind: "single_choice", optionId: editedLiveAnswer }, privateSnapshot)).toBe(false);
  });

});
