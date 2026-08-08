import { describe, expect, it } from "vitest";

import { createPracticeSnapshots, gradePracticeAnswer } from "../practice/native";
import { generateOopSubjectTestlet } from "../generation/computer-science/testlets/programming-specialized";

describe("immutable mock question snapshots", () => {
  it("keeps the answer key out of the browser snapshot", () => {
    const snapshot = createPracticeSnapshots({
      id: "question", module: "computer_science", questionType: "computer_science",
      topic: "Algorithms", subtopic: null, difficulty: "easy", questionText: "Choose.",
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

  it("freezes an accepted Computer Science presentation and keeps its answers private", () => {
    const testlet = generateOopSubjectTestlet({ seed: "snapshot-oop", difficulty: "medium" });
    const source = {
      id: testlet.id, module: "computer_science" as const, questionType: "computer_science" as const, topic: testlet.topic,
      subtopic: testlet.subtopic, difficulty: testlet.overallDifficulty, questionText: testlet.stimulus.title,
      passage: null, code: null, formula: null, tableData: null, imageUrl: null, estimatedTimeSeconds: 240,
      structuredData: { stimulus: testlet.stimulus, questions: testlet.questions }, metadata: { generation: testlet.metadata },
      explanation: testlet.questions.map((question) => question.explanation).join("\n"), options: [], correctOptionId: null, sourceType: "generated" as const,
    };
    const snapshot = createPracticeSnapshots(source);
    const frozen = JSON.stringify(snapshot.publicQuestion);
    testlet.stimulus.title = "A later generator title";
    testlet.questions[0].questionText = "A later generator prompt";
    expect(JSON.stringify(snapshot.publicQuestion)).toBe(frozen);
    expect(frozen).not.toContain("correctOptionId");
    expect(frozen).not.toContain("verifiedCorrectOptionId");
    expect(snapshot.privateSnapshot.correctAnswer).toEqual(Object.fromEntries(testlet.questions.map((question) => [question.id, question.correctOptionId])));
  });
});
