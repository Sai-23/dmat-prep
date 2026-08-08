import { createFingerprint } from "../fingerprint";
import type { ComputerScienceSubjectUnit } from "./types";

export function fingerprintComputerScienceSubjectUnit(unit: ComputerScienceSubjectUnit): string {
  return createFingerprint("computer-science-unit", {
    topic: unit.topic,
    stimulus: unit.stimulus.blocks,
    questions: unit.questions.map((question) => ({
      topic: question.topic,
      subtopic: question.subtopic ?? null,
      difficulty: question.difficulty,
      prompt: question.prompt,
      blocks: question.blocks,
      options: question.options.map((option) => option.content),
      correctOptionIndex: question.options.findIndex((option) => option.id === question.correctOptionId),
    })),
  });
}
