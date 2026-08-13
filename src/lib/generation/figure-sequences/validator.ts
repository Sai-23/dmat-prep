import type { GenerationDifficulty, QuestionValidator, ValidationCheck, ValidationIssue, ValidationResult } from "../types";
import { calculateFigureDifficulty } from "./difficulty";
import { figureFrameSimilarity, visibleFrameValue } from "./distractors";
import { replayFigureSequence } from "./engine";
import { figureStructuralSignature } from "./fingerprint";
import { validateFigureFrameStructure } from "./validation";
import { FIGURE_SEQUENCE_VALIDATOR_VERSION, type FigureSequenceCandidate, type FigureValidationSolution } from "./types";

const check = (stage: ValidationCheck["stage"], passed: boolean, details?: ValidationCheck["details"]): ValidationCheck => ({ stage, passed, validatorVersion: FIGURE_SEQUENCE_VALIDATOR_VERSION, ...(details === undefined ? {} : { details }) });
const issue = (stage: ValidationIssue["stage"], code: string, message: string): ValidationIssue => ({ stage, code, message });
const sameFrame = (a: Parameters<typeof visibleFrameValue>[0], b: Parameters<typeof visibleFrameValue>[0]) => visibleFrameValue(a) === visibleFrameValue(b);

function explain(candidate: FigureSequenceCandidate): string {
  return candidate.structuredData.rules.map((rule) => {
    const parts: string[] = [];
    if (rule.movement?.kind === "linear") parts.push(`moves ${rule.movement.direction.replaceAll("_", " ")}${rule.movement.progression === "incrementing" ? " by one additional cell each step" : ""}`);
    if (rule.movement?.kind === "border") parts.push(`travels ${rule.movement.direction.replace("_", "-")} around the border`);
    if (rule.movement?.kind === "direction_cycle") parts.push(`cycles through ${rule.movement.directions.map((value) => value.replaceAll("_", " ")).join(", ")}`);
    if (rule.rotation) parts.push(`rotates ${rule.rotation.direction}${rule.rotation.progression === "incrementing" ? " by an increasing number of quarter-turns" : " by one quarter-turn"}`);
    if (rule.colour) parts.push(`cycles colour through ${rule.colour.cycle.join(", ")}`);
    return `${rule.symbolId} ${parts.join(" and ")}.`;
  }).join(" ") + " Applying these rules twice gives the two selected matrices.";
}

export class FigureSequenceValidator implements QuestionValidator<FigureSequenceCandidate, FigureValidationSolution> {
  readonly questionType = "figure_sequence" as const;
  readonly version = FIGURE_SEQUENCE_VALIDATOR_VERSION;

  validate(candidate: FigureSequenceCandidate, requestedDifficulty: GenerationDifficulty): ValidationResult<FigureValidationSolution> {
    const checks: ValidationCheck[] = [];
    const { grid, visibleFrames, rules } = candidate.structuredData;
    const formatValid = candidate.questionType === "figure_sequence" && candidate.module === "core" && visibleFrames.length === 4 && candidate.solutionFrames.length === 2 && candidate.sequence.missingMatrices.length === 2 && candidate.response.kind === "two_stage_single_choice" && candidate.correctAnswer.length === 2 && candidate.sequence.missingMatrices.every((matrix, index) => matrix.sequenceIndex === index + 4 && matrix.candidates.length === 3);
    checks.push(check("format", formatValid));
    if (!formatValid) return { valid: false, issues: [issue("format", "invalid_figure_format", "A figure sequence requires four visible matrices and two three-option answer groups.")], checks };

    const frames = [...visibleFrames, ...candidate.solutionFrames, ...candidate.sequence.missingMatrices.flatMap((matrix) => matrix.candidates.map((item) => item.frame))];
    const symbolIds = visibleFrames[0].symbols.map((symbol) => symbol.id).sort().join("|");
    const symbolIdList = symbolIds.split("|");
    const domainValid = frames.every((frame) => validateFigureFrameStructure(grid, frame).valid && frame.symbols.map((symbol) => symbol.id).sort().join("|") === symbolIds) &&
      rules.length === symbolIdList.length &&
      new Set(rules.map((rule) => rule.symbolId)).size === rules.length &&
      rules.every((rule) => symbolIdList.includes(rule.symbolId) && Boolean(rule.movement || rule.rotation || rule.colour));
    checks.push(check("domain", domainValid));
    if (!domainValid) return { valid: false, issues: [issue("domain", "invalid_figure_domain", "A matrix is structurally invalid or changes symbol identity.")], checks };

    let replayed;
    try { replayed = replayFigureSequence(grid, visibleFrames[0], rules, 5); }
    catch { checks.push(check("safety", false)); return { valid: false, issues: [issue("safety", "unsafe_transformation", "The transformation leaves the grid or creates an overlap.")], checks }; }
    const replayMatches = visibleFrames.every((frame, index) => sameFrame(frame, replayed[index])) && candidate.solutionFrames.every((frame, index) => sameFrame(frame, replayed[index + 4]));
    checks.push(check("solve", replayMatches));
    if (!replayMatches) return { valid: false, issues: [issue("solve", "sequence_replay_mismatch", "Independent replay does not reproduce the stored sequence.")], checks };

    const selected: string[] = [];
    let unique = true;
    candidate.sequence.missingMatrices.forEach((matrix, index) => {
      const values = matrix.candidates.map((item) => visibleFrameValue(item.frame));
      const matches = matrix.candidates.filter((item) => sameFrame(item.frame, replayed[index + 4]));
      const distractorsAreNearNeighbours = matrix.candidates
        .filter((item) => !sameFrame(item.frame, replayed[index + 4]))
        .every((item) => {
          const expectedSimilarity = Math.max(0, symbolIdList.length - 1) / symbolIdList.length;
          return figureFrameSimilarity(item.frame, replayed[index + 4]) === expectedSimilarity;
        });
      if (new Set(values).size !== 3 || matches.length !== 1 || !distractorsAreNearNeighbours) unique = false;
      else selected.push(matches[0].id);
    });
    const answerMatches = unique && selected.every((id, index) => id === candidate.correctAnswer[index]);
    checks.push(check("uniqueness", answerMatches, { correctCandidateIds: selected }));
    if (!answerMatches) return { valid: false, issues: [issue("uniqueness", "ambiguous_or_wrong_options", "Each answer group must contain exactly one replayed matrix and identify it correctly.")], checks };
    checks.push(check("safety", true));

    const calculated = calculateFigureDifficulty(candidate);
    const difficultyMatches = calculated.difficulty === requestedDifficulty;
    checks.push(check("difficulty", difficultyMatches, {
      ...calculated.metrics,
      structuralSignature: figureStructuralSignature(candidate),
    }));
    if (!difficultyMatches) return { valid: false, issues: [issue("difficulty", "difficulty_mismatch", `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.`)], checks };
    const explanation = explain(candidate);
    checks.push(check("explanation", explanation.length > 0));
    return { valid: true, solution: { correctCandidateIds: selected, calculatedDifficulty: calculated.difficulty, metrics: calculated.metrics, explanation }, checks };
  }
}

export const figureSequenceValidator = new FigureSequenceValidator();
