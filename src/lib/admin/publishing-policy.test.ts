import { describe, expect, it } from "vitest";
import { canAccessPrivateQuestionBank, canMakeReviewDecision, canManageQuestionLifecycle, evaluatePublication } from "./publishing-policy";

const validatedMetadata = {
  generation: { seed: "seed", generatorVersion: "generator@1", validatorVersion: "validator@1", fingerprint: "type:v1:0123456789abcdef" },
  validation: { valid: true, checks: [{ stage: "solve", passed: true }] },
};

describe("question-bank publication policy", () => {
  it.each([
    ["mathematical_equation", { response: { kind: "symbol_assignment", symbols: ["A"] } }],
    ["latin_square", { response: { kind: "single_choice", options: [1, 2, 3, 4, 5] } }],
    ["figure_sequence", { response: { kind: "two_stage_single_choice", stages: [[], []] } }],
  ])("publishes validated generated %s content without fake database options", (questionType, structuredData) => {
    expect(evaluatePublication({ verificationStatus: "approved", questionType, sourceType: "generated", optionCount: 0, correctOptionId: null, structuredData, metadata: validatedMetadata })).toEqual({ allowed: true });
  });

  it("rejects generated content with failed checks or missing provenance", () => {
    expect(evaluatePublication({ verificationStatus: "approved", questionType: "latin_square", sourceType: "generated", optionCount: 0, correctOptionId: null, structuredData: { response: { kind: "single_choice", options: [1, 2, 3, 4, 5] } }, metadata: { validation: { valid: true, checks: [{ passed: false }] } } }).allowed).toBe(false);
  });

  it("retains four-option requirements for conventional content", () => {
    expect(evaluatePublication({ verificationStatus: "approved", questionType: "mathematical_equation", sourceType: "manual", optionCount: 4, correctOptionId: "correct", structuredData: {}, metadata: {} }).allowed).toBe(true);
    expect(evaluatePublication({ verificationStatus: "approved", questionType: "mathematical_equation", sourceType: "manual", optionCount: 3, correctOptionId: "correct", structuredData: {}, metadata: {} }).allowed).toBe(false);
  });

  it("enforces student, reviewer, and admin permissions", () => {
    expect(canAccessPrivateQuestionBank(["student"])).toBe(false);
    expect(canMakeReviewDecision(["reviewer"])).toBe(true);
    expect(canManageQuestionLifecycle(["reviewer"])).toBe(false);
    expect(canManageQuestionLifecycle(["admin"])).toBe(true);
  });
});
