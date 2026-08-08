import { createFingerprint } from "../../fingerprint";
import type { JsonValue } from "../../types";
import type { SubjectStimulusBlock, SubjectTestlet, SubjectTestletQuestion } from "./types";

function semanticBlock(block: SubjectStimulusBlock): JsonValue {
  if (block.kind === "paragraph") return { kind: block.kind };
  if ("code" in block) return { kind: block.kind, code: block.code, language: block.language ?? null };
  if (block.kind === "formula") return { kind: block.kind, expression: block.expression };
  return { kind: block.kind, data: block.data };
}

export function fingerprintSubjectTestletQuestion(question: SubjectTestletQuestion): string {
  return createFingerprint("computer-science-child", {
    family: question.family,
    reasoningRole: question.reasoningRole,
    stimulusBlockIds: [...question.stimulusBlockIds].sort(),
    semanticParameters: question.semanticParameters,
    options: question.options.map((option) => option.content),
    correctOptionIndex: question.options.findIndex((option) => option.id === question.correctOptionId),
  });
}

export function fingerprintSubjectTestlet(testlet: Omit<SubjectTestlet, "metadata"> | SubjectTestlet): string {
  return createFingerprint("computer-science-testlet", {
    module: testlet.module,
    topic: testlet.topic,
    subtopic: testlet.subtopic,
    overallDifficulty: testlet.overallDifficulty,
    stimulus: testlet.stimulus.blocks.map(semanticBlock),
    questionComposition: testlet.questions.map((question) => ({ family: question.family, reasoningRole: question.reasoningRole, semanticParameters: question.semanticParameters })),
    semanticParameters: "metadata" in testlet ? testlet.metadata.semanticParameters : null,
  });
}
