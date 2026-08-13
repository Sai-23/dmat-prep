import { canonicalize } from "../fingerprint";
import type { GenerationDifficulty } from "../types";
import { figureFrameSimilarity } from "./distractors";
import type {
  FigureDifficultyMetrics,
  FigureSequenceCandidate,
  FigureSymbolRuleSet,
} from "./types";

function normalizedRule(rule: FigureSymbolRuleSet): string {
  return canonicalize({
    movement: rule.movement ?? null,
    rotation: rule.rotation ?? null,
    colour: rule.colour ?? null,
  });
}

function isDiagonal(rule: FigureSymbolRuleSet): boolean {
  if (rule.movement?.kind === "linear") {
    return rule.movement.direction.includes("_");
  }
  return rule.movement?.kind === "direction_cycle"
    ? rule.movement.directions.some((direction) => direction.includes("_"))
    : false;
}

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
  const independentRuleCount = new Set(rules.map(normalizedRule)).size;
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
  const borderRuleCount = rules.filter((rule) => rule.movement?.kind === "border").length;
  const orientationRuleCount = rules.filter((rule) => rule.rotation).length;
  const diagonalRuleCount = rules.filter(isDiagonal).length;
  const pathComplexity = borderRuleCount * 2 + diagonalRuleCount * 2 +
    rules.filter((rule) => rule.movement?.kind === "direction_cycle").length * 3;
  const cycleComplexity = rules.reduce((total, rule) => {
    const directionLength = rule.movement?.kind === "direction_cycle"
      ? rule.movement.directions.length
      : 0;
    const colourLength = rule.colour?.cycle.length ?? 0;
    return total + Math.max(0, directionLength - 2) + Math.max(0, colourLength - 2);
  }, 0);
  const advancedRuleCount = rules.reduce(
    (total, rule) =>
      total +
      Number(rule.movement?.kind === "border") +
      Number(rule.movement?.kind === "direction_cycle") +
      Number(isDiagonal(rule)) +
      Number(rule.movement?.progression === "incrementing") +
      Number(rule.rotation?.progression === "incrementing") +
      Number(Boolean(rule.colour)),
    0,
  );
  const predictionDepth = candidate.solutionFrames.length;
  const similarities = candidate.sequence.missingMatrices.flatMap((matrix, index) =>
    matrix.candidates
      .filter((option) => option.id !== candidate.correctAnswer[index])
      .map((option) => figureFrameSimilarity(candidate.solutionFrames[index], option.frame)),
  );
  const distractorSimilarity = similarities.length
    ? similarities.reduce((total, value) => total + value, 0) / similarities.length
    : 0;
  const score =
    symbolCount * 2 +
    independentRuleCount * 2 +
    movementRuleCount +
    attributeRuleCount +
    advancedRuleCount * 2 +
    orientationRuleCount +
    cycleComplexity +
    predictionDepth;

  let difficulty: GenerationDifficulty;
  if (score <= 12 && symbolCount <= 2 && advancedRuleCount <= 1) {
    difficulty = "easy";
  } else if (
    score <= 26 &&
    symbolCount <= 3 &&
    independentRuleCount >= 2 &&
    advancedRuleCount <= 2
  ) {
    difficulty = "medium";
  } else {
    difficulty = "hard";
  }

  return {
    difficulty,
    metrics: {
      symbolCount,
      movementRuleCount,
      attributeRuleCount,
      independentRuleCount,
      progressiveRuleCount,
      cycleRuleCount,
      borderRuleCount,
      orientationRuleCount,
      pathComplexity,
      cycleComplexity,
      advancedRuleCount,
      predictionDepth,
      distractorSimilarity,
      score,
    },
  };
}
