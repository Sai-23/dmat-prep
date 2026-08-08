import type { ValidationCheck, ValidationIssue } from "../types";
import { fingerprintLatinSquare } from "./fingerprint";
import { latinSquareGenerator } from "./generator";
import {
  LATIN_SQUARE_VALIDATOR_VERSION,
  type LatinSquareGenerationConfiguration,
  type LatinSquareQuestion,
} from "./types";
import { latinSquareValidator } from "./validator";

const DEFAULT_MAX_ATTEMPTS = 500;
const MAX_GENERATION_ATTEMPTS = 5_000;

export class LatinSquareGenerationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastIssues: ValidationIssue[],
  ) {
    super(message);
    this.name = "LatinSquareGenerationError";
  }
}

function acceptedQuestion(
  configuration: LatinSquareGenerationConfiguration,
  attempt: number,
): LatinSquareQuestion {
  const candidate = latinSquareGenerator.generate(configuration, attempt);
  const validation = latinSquareValidator.validate(candidate, configuration.difficulty);
  if (!validation.valid) {
    throw new LatinSquareGenerationError(
      `Latin-square attempt ${attempt} failed independent validation.`,
      attempt,
      validation.issues,
    );
  }
  const fingerprint = fingerprintLatinSquare(candidate);
  const timestamp = new Date().toISOString();
  return {
    ...candidate,
    explanation: validation.solution.explanation,
    deductionTrace: validation.solution.deductions,
    metadata: {
      seed: configuration.seed,
      generatorVersion: latinSquareGenerator.version,
      validatorVersion: latinSquareValidator.version,
      requestedDifficulty: configuration.difficulty,
      calculatedDifficulty: validation.solution.calculatedDifficulty,
      generatedAt: timestamp,
      attemptCount: attempt,
      fingerprint,
    },
    validation: {
      valid: true,
      validatedAt: timestamp,
      checks: validation.checks,
    },
  };
}

export function reproduceValidatedLatinSquare(
  configuration: LatinSquareGenerationConfiguration,
  attempt: number,
): LatinSquareQuestion {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_GENERATION_ATTEMPTS) {
    throw new RangeError(`attempt must be an integer from 1 through ${MAX_GENERATION_ATTEMPTS}.`);
  }
  const question = acceptedQuestion(configuration, attempt);
  return {
    ...question,
    validation: {
      ...question.validation,
      checks: [
        ...question.validation.checks,
        {
          stage: "duplicate",
          passed: true,
          validatorVersion: LATIN_SQUARE_VALIDATOR_VERSION,
          details: { fingerprint: question.metadata.fingerprint },
        },
      ],
    },
  };
}

export function generateValidatedLatinSquare(
  configuration: LatinSquareGenerationConfiguration,
  acceptedFingerprints: ReadonlySet<string> = new Set(),
): LatinSquareQuestion {
  const maxAttempts = configuration.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_GENERATION_ATTEMPTS) {
    throw new RangeError(`maxAttempts must be an integer from 1 through ${MAX_GENERATION_ATTEMPTS}.`);
  }

  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let question: LatinSquareQuestion;
    try {
      question = acceptedQuestion(configuration, attempt);
    } catch (error) {
      if (error instanceof LatinSquareGenerationError) {
        lastIssues = error.lastIssues;
        continue;
      }
      throw error;
    }
    const fingerprint = question.metadata.fingerprint;
    if (acceptedFingerprints.has(fingerprint)) {
      lastIssues = [{ stage: "duplicate", code: "duplicate_fingerprint", message: "The Latin-square clue structure duplicates accepted content." }];
      continue;
    }
    const duplicateCheck: ValidationCheck = {
      stage: "duplicate",
      passed: true,
      validatorVersion: LATIN_SQUARE_VALIDATOR_VERSION,
      details: { fingerprint },
    };
    return {
      ...question,
      validation: {
        ...question.validation,
        checks: [...question.validation.checks, duplicateCheck],
      },
    };
  }

  throw new LatinSquareGenerationError(
    `Unable to generate a validated Latin square in ${maxAttempts} attempts.`,
    maxAttempts,
    lastIssues,
  );
}
