import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import { createFigureCandidates } from "./distractors";
import { replayFigureSequence } from "./engine";
import {
  FIGURE_SEQUENCE_GENERATOR_VERSION,
  type FigureDirection,
  type FigureGridDefinition,
  type FigureMissingMatrix,
  type FigureSequenceCandidate,
  type FigureSequenceGenerationConfiguration,
  type FigureSymbolRuleSet,
  type FigureSymbolState,
} from "./types";

const GRID: FigureGridDefinition = { rows: 5, columns: 5 };
const ESTIMATED_SECONDS = { easy: 65, medium: 85, hard: 110 } as const;
const CARDINAL_DIRECTIONS: FigureDirection[] = ["up", "down", "left", "right"];

function randomFor(configuration: FigureSequenceGenerationConfiguration, attempt: number) {
  if (!configuration.seed.trim()) throw new Error("A non-empty figure-sequence seed is required.");
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("Generation attempt must be positive.");
  return new SeededRandom(
    `${FIGURE_SEQUENCE_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`,
  );
}

function perimeterPosition(random: SeededRandom) {
  const positions = Array.from({ length: 16 }, (_, index) => {
    if (index < 5) return { row: 0, column: index };
    if (index < 9) return { row: index - 4, column: 4 };
    if (index < 13) return { row: 4, column: 12 - index };
    return { row: 16 - index, column: 0 };
  });
  return random.pick(positions);
}

function createModel(difficulty: "easy" | "medium" | "hard", random: SeededRandom) {
  const alpha: FigureSymbolState = {
    id: "alpha", shape: "arrow", color: "blue", fill: "solid", orientation: random.pick([0, 90, 180, 270]),
    row: random.integer(1, 3), column: random.integer(1, 3),
  };
  if (difficulty === "easy") {
    const useBorder = random.boolean();
    if (useBorder) Object.assign(alpha, perimeterPosition(random));
    const rules: FigureSymbolRuleSet[] = [{
      symbolId: "alpha",
      movement: useBorder
        ? { kind: "border", direction: random.boolean() ? "clockwise" : "counter_clockwise", steps: 1, progression: "fixed" }
        : { kind: "linear", direction: random.pick(CARDINAL_DIRECTIONS), steps: 1, progression: "fixed", boundary: "bounce" },
    }];
    return { symbols: [alpha], rules };
  }

  const beta: FigureSymbolState = {
    id: "beta", shape: "diamond", color: "pink", fill: "outline", orientation: 0,
    ...perimeterPosition(random),
  };
  if (alpha.row === beta.row && alpha.column === beta.column) alpha.row = alpha.row === 3 ? 2 : 3;
  if (difficulty === "medium") {
    const rules: FigureSymbolRuleSet[] = [
      { symbolId: "alpha", movement: { kind: "linear", direction: random.pick(CARDINAL_DIRECTIONS), steps: 1, progression: "fixed", boundary: "bounce" }, rotation: { direction: "clockwise", quarterTurns: 1, progression: "fixed" } },
      { symbolId: "beta", movement: { kind: "border", direction: "clockwise", steps: 1, progression: "fixed" } },
    ];
    return { symbols: [alpha, beta], rules };
  }

  beta.row = random.integer(0, 4);
  beta.column = random.integer(0, 4);
  if (alpha.row === beta.row && alpha.column === beta.column) beta.column = (beta.column + 2) % 5;
  const rules: FigureSymbolRuleSet[] = [
    { symbolId: "alpha", movement: { kind: "linear", direction: random.pick(CARDINAL_DIRECTIONS), steps: 1, progression: "incrementing", boundary: "bounce" }, rotation: { direction: "clockwise", quarterTurns: 1, progression: "incrementing" } },
    { symbolId: "beta", movement: { kind: "direction_cycle", directions: random.boolean() ? ["right", "down", "left", "up"] : ["down", "right", "up", "left"], steps: 1, progression: "fixed", boundary: "bounce" }, colour: { cycle: ["pink", "yellow", "green"], steps: 1, progression: "fixed" } },
  ];
  return { symbols: [alpha, beta], rules };
}

export class FigureSequenceGenerator implements QuestionGenerator<FigureSequenceGenerationConfiguration, FigureSequenceCandidate> {
  readonly questionType = "figure_sequence" as const;
  readonly version = FIGURE_SEQUENCE_GENERATOR_VERSION;

  generate(configuration: FigureSequenceGenerationConfiguration, attempt: number): FigureSequenceCandidate {
    const random = randomFor(configuration, attempt);
    const model = createModel(configuration.difficulty, random);
    const frames = replayFigureSequence(GRID, { index: 0, symbols: model.symbols }, model.rules, 5);
    const first = createFigureCandidates(GRID, frames[4], frames[3], random.fork("slot-1"), 1);
    const second = createFigureCandidates(GRID, frames[5], frames[4], random.fork("slot-2"), 2);
    const missingMatrices: [FigureMissingMatrix, FigureMissingMatrix] = [
      { sequenceIndex: 4, candidates: first.candidates },
      { sequenceIndex: 5, candidates: second.candidates },
    ];
    const structuredData = { grid: GRID, visibleFrames: frames.slice(0, 4), rules: model.rules };
    return {
      questionType: "figure_sequence", module: "core", topic: "Figure Sequences", subtopic: "Transformation rules",
      presentation: { prompt: "Choose the next two matrices in the sequence.", blocks: [{ kind: "diagram", data: { grid: GRID, visibleFrames: frames.slice(0, 4), missingMatrices } }] },
      structuredData,
      response: { kind: "two_stage_single_choice", stages: missingMatrices.map((matrix) => matrix.candidates.map((candidate) => ({ id: candidate.id, label: candidate.label, content: { frame: candidate.frame } }))) as [never[], never[]] },
      correctAnswer: [first.correctCandidateId, second.correctCandidateId],
      explanation: "The independently validated transformation rules determine both missing matrices.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      sequence: { ...structuredData, missingMatrices }, solutionFrames: [frames[4], frames[5]],
    };
  }
}

export const figureSequenceGenerator = new FigureSequenceGenerator();
