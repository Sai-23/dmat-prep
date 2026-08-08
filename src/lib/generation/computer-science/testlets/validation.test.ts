import { describe, expect, it } from "vitest";
import { fingerprintSubjectTestlet, fingerprintSubjectTestletQuestion } from "./fingerprint";
import { SUBJECT_TESTLET_VALIDATOR_VERSION, type SubjectTestlet, type SubjectTestletQuestion } from "./types";
import { validateSubjectTestlet } from "./validation";

const roles = ["direct_application", "interpretation", "calculation", "scenario_transfer", "comparison", "error_detection", "alternative_representation", "synthesis"] as const;

function question(index: number): SubjectTestletQuestion {
  const options = [10 + index, 11 + index, 12 + index, 13 + index].map((content, optionIndex) => ({ id: `q${index}-o${optionIndex}`, label: String.fromCharCode(65 + optionIndex), content })) as SubjectTestletQuestion["options"];
  return {
    id: `question-${index}`,
    questionText: ["Determine the resulting state after applying operation alpha.", "Interpret the consequence of the highlighted transition.", "Calculate the number of comparisons shown by the trace.", "Apply the supplied rule to the alternate input case.", "Compare the two strategies using the supplied measurements.", "Identify the erroneous transition in the proposed execution.", "Select the equivalent representation of the supplied process.", "Choose a valid strategy combining both stated constraints."][(index - 1) % 8],
    family: `family-${index}`,
    reasoningRole: roles[(index - 1) % roles.length],
    stimulusBlockIds: index % 2 ? ["scenario"] : ["scenario", "algorithm"],
    difficulty: index < 2 ? "easy" : index < 4 ? "medium" : "hard",
    options,
    correctOptionId: options[index % 4].id,
    explanation: `The verified trace selects option ${options[index % 4].label}.`,
    semanticParameters: { operation: index, expected: options[index % 4].content },
    validation: { solverVersion: "fixture-solver@1", verifiedCorrectOptionId: options[index % 4].id, explanationVerified: true, ambiguous: false },
  };
}

function testlet(size = 4): SubjectTestlet {
  const questions = Array.from({ length: size }, (_, index) => question(index + 1));
  const value: SubjectTestlet = {
    schemaVersion: 1,
    id: "testlet-1",
    module: "algorithms",
    topic: "searching",
    subtopic: "trace_analysis",
    overallDifficulty: "medium",
    stimulus: { id: "stimulus-1", title: "Analyze a deterministic search trace", blocks: [
      { id: "scenario", kind: "paragraph", text: "A search procedure is applied to a small ordered collection." },
      { id: "algorithm", kind: "pseudocode", code: "while low <= high:\n  inspect midpoint" },
      { id: "measurements", kind: "table", data: { headers: ["step", "value"], rows: [[1, 8], [2, 12]] } },
    ] },
    questions,
    metadata: {
      testletId: "testlet-1", stimulusTypes: ["paragraph", "pseudocode", "table"], questionCount: size,
      questionFamilies: questions.map((item) => item.family), overallDifficulty: "medium", seed: "fixture-seed",
      generatorVersion: "fixture-generator@1", validatorVersion: SUBJECT_TESTLET_VALIDATOR_VERSION, fingerprint: "pending",
      generationAttempts: 1, childFingerprints: [], semanticParameters: { collection: [4, 8, 12, 16] },
    },
  };
  value.metadata.childFingerprints = value.questions.map(fingerprintSubjectTestletQuestion);
  value.metadata.fingerprint = fingerprintSubjectTestlet(value);
  return value;
}

describe("CS1 subject testlet contract", () => {
  it.each([4, 5, 6, 7, 8])("accepts a valid %i-question testlet", (size) => {
    const result = validateSubjectTestlet(testlet(size));
    expect(result.valid).toBe(true);
  });

  it("rejects fewer than four or more than eight questions", () => {
    expect(validateSubjectTestlet(testlet(3)).valid).toBe(false);
    expect(validateSubjectTestlet(testlet(9)).valid).toBe(false);
  });

  it("rejects duplicate options and incorrect independent verification", () => {
    const value = testlet();
    value.questions[0].options[1].content = value.questions[0].options[0].content;
    value.questions[1].validation.verifiedCorrectOptionId = value.questions[1].options[0].id;
    const result = validateSubjectTestlet(value);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["duplicate_options", "independent_verification_failed"]));
  });

  it("rejects hidden answer data in the visible stimulus", () => {
    const value = testlet();
    value.stimulus.blocks.push({ id: "unsafe", kind: "diagram", data: { correctAnswer: "A" } });
    expect(validateSubjectTestlet(value)).toMatchObject({ valid: false, issues: expect.arrayContaining([expect.objectContaining({ code: "invalid_stimulus" })]) });
  });

  it("rejects insufficient diversity and near-duplicate children", () => {
    const value = testlet();
    value.questions.forEach((item) => { item.reasoningRole = "direct_application"; });
    value.questions[1].questionText = value.questions[0].questionText;
    const result = validateSubjectTestlet(value);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(["insufficient_reasoning_diversity", "near_duplicate_question"]));
  });

  it("creates stable semantic child and testlet fingerprints", () => {
    const first = testlet();
    const originalChild = fingerprintSubjectTestletQuestion(first.questions[0]);
    const originalTestlet = fingerprintSubjectTestlet(first);
    first.stimulus.title = "Reworded title";
    first.stimulus.blocks[0] = { id: "scenario", kind: "paragraph", text: "Equivalent original wording was varied." };
    first.questions[0].questionText = "Equivalent question wording was varied.";
    expect(fingerprintSubjectTestletQuestion(first.questions[0])).toBe(originalChild);
    expect(fingerprintSubjectTestlet(first)).toBe(originalTestlet);
    first.questions[0].semanticParameters = { operation: 999 };
    expect(fingerprintSubjectTestletQuestion(first.questions[0])).not.toBe(originalChild);
    expect(fingerprintSubjectTestlet(first)).not.toBe(originalTestlet);
  });
});
