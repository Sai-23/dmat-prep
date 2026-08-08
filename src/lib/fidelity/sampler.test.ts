import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  generateValidatedFigureSequence,
  generateValidatedLatinSquare,
  generateValidatedMathematicalEquation,
  type GenerationDifficulty,
  type JsonValue,
} from "../generation";
import type { FidelityAuditSample } from "./types";

const ENABLED = process.env.DMAT_Q2_SAMPLE === "1";
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const PER_DIFFICULTY = 10;

function jsonSnapshot(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value)) as JsonValue;
}

function samplesFor(
  questionType: FidelityAuditSample["questionType"],
  difficulty: GenerationDifficulty,
): FidelityAuditSample[] {
  const fingerprints = new Set<string>();
  return Array.from({ length: PER_DIFFICULTY }, (_, index) => {
    const seed = `q2:${questionType}:${difficulty}:${index + 1}`;
    const question = questionType === "mathematical_equation"
      ? generateValidatedMathematicalEquation({ seed, difficulty }, fingerprints)
      : questionType === "latin_square"
        ? generateValidatedLatinSquare({ seed, difficulty }, fingerprints)
        : generateValidatedFigureSequence({ seed, difficulty }, fingerprints);
    fingerprints.add(question.metadata.fingerprint);
    return {
      sampleId: `q2-${questionType}-${difficulty}-${String(index + 1).padStart(2, "0")}`,
      questionType,
      difficulty,
      seed,
      generatorVersion: question.metadata.generatorVersion,
      validatorVersion: question.metadata.validatorVersion,
      fingerprint: question.metadata.fingerprint,
      generatedSnapshot: jsonSnapshot(question),
    };
  });
}

describe.skipIf(!ENABLED)("Q2 official-format audit sampler", () => {
  it("creates 90 unique, balanced, reproducible review samples", () => {
    const types = ["mathematical_equation", "latin_square", "figure_sequence"] as const;
    const samples = types.flatMap((type) => DIFFICULTIES.flatMap((difficulty) => samplesFor(type, difficulty)));
    expect(samples).toHaveLength(90);
    expect(new Set(samples.map((sample) => sample.sampleId)).size).toBe(90);
    expect(new Set(samples.map((sample) => sample.fingerprint)).size).toBe(90);

    const outputDirectory = join(process.cwd(), "reports", "q2");
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(join(outputDirectory, "audit-sample.json"), `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), sampleCount: samples.length, samples }, null, 2)}\n`, "utf8");
    writeFileSync(join(outputDirectory, "review-template.json"), `${JSON.stringify({
      schemaVersion: 1,
      scale: {
        common: "All fields use 1 (unacceptable) through 5 (excellent).",
        ambiguity: "1 means clearly ambiguous; 5 means unambiguous. Set ambiguityFlag=true whenever ambiguity requires investigation.",
        difficultyAgreement: "True only when the reviewer agrees with the requested/calculated label relative to the official demonstrated examples.",
      },
      commonFields: ["correctness", "formatFidelity", "clarity", "difficultyAppropriateness", "ambiguity", "mentalWorkloadAppropriateness", "overallQuality", "difficultyAgreement", "ambiguityFlag", "comments"],
      taskSpecificCriteria: {
        mathematical_equation: ["variableCountAppropriate", "dependencyDepthAppropriate", "mentalArithmeticAppropriate", "officialStructureSimilar", "avoidsUnnecessaryAdvancedMathematics"],
        latin_square: ["gridIsFiveByFive", "clueDensityAppropriate", "deductionDepthAppropriate", "targetReasoningClear", "officialFormatSimilar"],
        figure_sequence: ["matrixPresentationClear", "symbolCountAppropriate", "movementRuleLegible", "boundaryBehaviourLegible", "rotationLegible", "colourChangesLegible", "progressionLegible", "multiSymbolComplexityAppropriate", "candidateStructureCorrect", "visualClarity"],
      },
      reviews: samples.map((sample) => ({ sampleId: sample.sampleId, reviewerId: null, scores: null, difficultyAgreement: null, ambiguityFlag: null, taskSpecific: {}, comments: "" })),
    }, null, 2)}\n`, "utf8");
    writeFileSync(join(outputDirectory, "fidelity-report.md"), `# Q2 Official dMAT Format Fidelity Audit\n\n## Status\n\nThe balanced 90-item sample is ready. Human review is pending; no reviewer scores have been fabricated.\n\n## Sample\n\n- Mathematical Equations: 10 easy, 10 medium, 10 hard\n- Latin Squares: 10 easy, 10 medium, 10 hard\n- Figure Sequences: 10 easy, 10 medium, 10 hard\n\nEvery sample retains its stable sample ID, seed, generator version, validator version, difficulty, fingerprint, and immutable generated snapshot.\n\n## Difficulty policy\n\nThe official material demonstrates low, medium, and high examples but does not publish numeric thresholds. Platform difficulty scores are versioned heuristics and must be reviewed against the demonstrated examples; they are not official psychometric classifications.\n\n## Human-review results\n\nPending. Means, difficulty agreement, ambiguity flags, and comments must remain unset until reviews are submitted.\n`, "utf8");
  }, 120_000);
});
