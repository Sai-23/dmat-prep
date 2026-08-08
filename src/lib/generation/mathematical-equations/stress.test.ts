import { describe, expect, it } from "vitest";

import { mathematicalEquationGenerator } from "./generator";
import { generateValidatedMathematicalEquation } from "./pipeline";
import { mathematicalEquationValidator } from "./validator";

const STRESS_ENABLED = process.env.DMAT_EQUATION_STRESS === "1";
const SEEDS_PER_DIFFICULTY = 10_000;

type StressStatistics = {
  difficulty: "easy" | "medium" | "hard";
  accepted: number;
  invalidAccepted: number;
  nondeterministic: number;
  uniqueFingerprints: number;
  structuralDuplicates: number;
  maximumAttempts: number;
  maximumSolverAssignments: number;
};

function runDifficulty(
  difficulty: StressStatistics["difficulty"],
): StressStatistics {
  const fingerprints = new Set<string>();
  let accepted = 0;
  let invalidAccepted = 0;
  let nondeterministic = 0;
  let maximumAttempts = 0;
  let maximumSolverAssignments = 0;

  for (let index = 0; index < SEEDS_PER_DIFFICULTY; index += 1) {
    const seed = `g4:${difficulty}:${index}`;
    const configuration = { seed, difficulty };
    try {
      const firstCandidate = mathematicalEquationGenerator.generate(configuration, 1);
      const replayedCandidate = mathematicalEquationGenerator.generate(configuration, 1);
      if (JSON.stringify(firstCandidate) !== JSON.stringify(replayedCandidate)) {
        nondeterministic += 1;
        throw new Error(`Non-deterministic candidate for seed ${seed}.`);
      }

      const question = generateValidatedMathematicalEquation(configuration);
      const independentResult = mathematicalEquationValidator.validate(
        firstCandidate,
        difficulty,
      );
      if (
        !independentResult.valid ||
        !question.validation.checks.every((check) => check.passed) ||
        question.metadata.seed !== seed ||
        question.metadata.requestedDifficulty !== difficulty ||
        question.metadata.calculatedDifficulty !== difficulty
      ) {
        invalidAccepted += 1;
        throw new Error(`Invalid question accepted for seed ${seed}.`);
      }

      accepted += 1;
      fingerprints.add(question.metadata.fingerprint);
      maximumAttempts = Math.max(maximumAttempts, question.metadata.attemptCount);
      maximumSolverAssignments = Math.max(
        maximumSolverAssignments,
        independentResult.solution.exploredAssignments,
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `G4 stress failure: difficulty=${difficulty}, seed=${seed}, index=${index}: ${detail}`,
        { cause: error },
      );
    }
  }

  return {
    difficulty,
    accepted,
    invalidAccepted,
    nondeterministic,
    uniqueFingerprints: fingerprints.size,
    structuralDuplicates: accepted - fingerprints.size,
    maximumAttempts,
    maximumSolverAssignments,
  };
}

describe.skipIf(!STRESS_ENABLED)("mathematical-equation G4 stress validation", () => {
  it(
    "validates 10,000 deterministic seeds per difficulty",
    () => {
      const statistics = (["easy", "medium", "hard"] as const).map(runDifficulty);
      for (const result of statistics) {
        expect(result.accepted).toBe(SEEDS_PER_DIFFICULTY);
        expect(result.invalidAccepted).toBe(0);
        expect(result.nondeterministic).toBe(0);
      }

      console.table(statistics);
    },
    120_000,
  );
});
