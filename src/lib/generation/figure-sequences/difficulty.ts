import type { GenerationDifficulty } from "../types";
import type {
  FigureDifficultyMetrics,
  FigureSequenceCandidate,
} from "./types";

export function calculateFigureDifficulty(candidate: FigureSequenceCandidate): {
  difficulty: GenerationDifficulty;
  metrics: FigureDifficultyMetrics;
} {
  const rules = candidate.structuredData.rules;
  const symbolCount = candidate.structuredData.visibleFrames[0]?.symbols.length ?? 0;
  const movementRuleCount = rules.filter((rule) => rule.movement).length;
  const attributeRuleCount = rules.reduce(
    (total, rule) => total + Number(Boolean(rule.rotation)) + Number(Boolean(rule.colour)),
    0,
  );
  const progressiveRuleCount = rules.reduce(
    (total, rule) =>
      total +
      Number(rule.movement?.progression === "incrementing") +
      Number(rule.rotation?.progression === "incrementing") +
      Number(rule.colour?.progression === "incrementing"),
    0,
  );
  const cycleRuleCount = rules.filter(
    (rule) => rule.movement?.kind === "direction_cycle" || Boolean(rule.colour),
  ).length;
  const borderRuleCount = rules.filter(
    (rule) => rule.movement?.kind === "border",
  ).length;
  const score =
    Math.max(0, symbolCount - 1) * 2 +
    movementRuleCount +
    attributeRuleCount +
    progressiveRuleCount * 2 +
    cycleRuleCount * 2 +
    borderRuleCount;
  const difficulty: GenerationDifficulty =
    score <= 2 ? "easy" : score <= 7 ? "medium" : "hard";
  return {
    difficulty,
    metrics: {
      symbolCount,
      movementRuleCount,
      attributeRuleCount,
      progressiveRuleCount,
      cycleRuleCount,
      borderRuleCount,
      score,
    },
  };
}

