import { describe, expect, it } from "vitest";
import { acceptCriticResult, aiPresentationSchema, applyAiPresentation, presentationContract } from "./hybrid-presentation";
import { generateProgrammingSubjectTestlet } from "./programming-testlets";

function validPresentation() {
  const testlet = generateProgrammingSubjectTestlet({ seed: "hybrid", difficulty: "easy" });
  const contract = presentationContract(testlet);
  const prompts = ["Predict the returned accumulator after the complete telemetry pass.", "Determine the final stored reading array after every applicable calibration.", "Calculate how many readings activate the conditional update branch.", "Identify the final value retained at the specified zero-based position."];
  return { testlet, presentation: { title: "Telemetry batch calibration", scenario: "A device service applies the supplied verified procedure to one stored batch.", questions: contract.questions.map((question, index) => ({ id: question.id, family: question.family, reasoningRole: question.reasoningRole, verificationClass: question.verificationClass, prompt: prompts[index], explanation: `Verified explanation ${index + 1}.`, options: question.options.map((option) => ({ id: option.id, valueToken: option.valueToken, displayText: String(option.verifiedValue) })) })) } };
}

describe("CS3.6 AI presentation contract", () => {
  it("accepts strict presentation while preserving deterministic identities and ground truth", () => {
    const { testlet, presentation } = validPresentation();
    const applied = applyAiPresentation(testlet, presentation, { model: "fixture-model" });
    expect(applied.stimulus.title).toBe("Telemetry batch calibration");
    expect(applied.questions.map((question) => question.correctOptionId)).toEqual(testlet.questions.map((question) => question.correctOptionId));
    expect(applied.metadata.modelIdentifier).toBe("fixture-model");
  });

  it("rejects malformed output and changed ground truth", () => {
    const { testlet, presentation } = validPresentation();
    expect(() => aiPresentationSchema.parse({ ...presentation, questions: [] })).toThrow();
    presentation.questions[0].options[0].valueToken = "changed";
    expect(() => applyAiPresentation(testlet, presentation, { model: "fixture-model" })).toThrow("AI_CHANGED_GROUND_TRUTH");
  });

  it.each(["PASS", "FAIL", "REQUIRES_HUMAN_REVIEW"] as const)("handles critic %s", (decision) => {
    const { testlet } = validPresentation();
    const result = acceptCriticResult(testlet, { decision, reasonCodes: decision === "PASS" ? [] : ["unclear_wording"], summary: "Structured critic fixture." });
    expect(result.critic.decision).toBe(decision);
    expect(result.testlet.metadata.reviewStatus).toBe(decision === "PASS" ? "validated" : decision === "FAIL" ? "rejected" : "needs_review");
  });

  it("never lets a critic override Class A solver truth", () => {
    const { testlet } = validPresentation();
    const result = acceptCriticResult(testlet, { decision: "FAIL", reasonCodes: ["technical_conflict"], summary: "Disagreement fixture." });
    expect(result.critic.decision).toBe("REQUIRES_HUMAN_REVIEW");
    expect(result.testlet.questions.every((question) => question.validation.verifiedCorrectOptionId === question.correctOptionId)).toBe(true);
  });
});
