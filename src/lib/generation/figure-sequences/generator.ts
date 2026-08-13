import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import { createFigureCandidates } from "./distractors";
import { replayFigureSequence } from "./engine";
import {
  FIGURE_COLORS,
  FIGURE_SEQUENCE_GENERATOR_VERSION,
  type FigureColor,
  type FigureDirection,
  type FigureGridDefinition,
  type FigureMissingMatrix,
  type FigureSequenceCandidate,
  type FigureSequenceGenerationConfiguration,
  type FigureShape,
  type FigureSymbolRuleSet,
  type FigureSymbolState,
} from "./types";

const GRID: FigureGridDefinition = { rows: 5, columns: 5 };
const ESTIMATED_SECONDS = { easy: 65, medium: 95, hard: 125 } as const;
const IDS = ["alpha", "beta", "gamma", "delta"] as const;
const CARDINAL_DIRECTIONS: FigureDirection[] = ["up", "down", "left", "right"];
const HORIZONTAL_DIRECTIONS: FigureDirection[] = ["left", "right"];
const VERTICAL_DIRECTIONS: FigureDirection[] = ["up", "down"];
const DIAGONAL_DIRECTIONS: FigureDirection[] = [
  "up_left",
  "up_right",
  "down_left",
  "down_right",
];

type Difficulty = FigureSequenceGenerationConfiguration["difficulty"];

function randomFor(configuration: FigureSequenceGenerationConfiguration, attempt: number) {
  if (!configuration.seed.trim()) throw new Error("A non-empty figure-sequence seed is required.");
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("Generation attempt must be positive.");
  return new SeededRandom(
    `${FIGURE_SEQUENCE_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${configuration.symbolCount ?? "weighted"}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`,
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

function weightedSymbolCount(difficulty: Difficulty, random: SeededRandom): 1 | 2 | 3 | 4 {
  const roll = random.next();
  if (difficulty === "easy") return roll < 0.55 ? 1 : 2;
  // Multi-symbol candidates collide more often, so these pre-validation weights
  // intentionally compensate for the acceptance bias measured by the audit.
  if (difficulty === "medium") return roll < 0.05 ? 2 : 3;
  return roll < 0.15 ? 3 : 4;
}

function resolveSymbolCount(
  configuration: FigureSequenceGenerationConfiguration,
  random: SeededRandom,
): 1 | 2 | 3 | 4 {
  const count = configuration.symbolCount ?? weightedSymbolCount(configuration.difficulty, random);
  const valid =
    (configuration.difficulty === "easy" && count >= 1 && count <= 2) ||
    (configuration.difficulty === "medium" && count >= 2 && count <= 3) ||
    (configuration.difficulty === "hard" && count >= 3 && count <= 4);
  if (!valid) {
    throw new RangeError(`A ${configuration.difficulty} figure sequence does not support ${count} symbols.`);
  }
  return count;
}

function createRules(
  difficulty: Difficulty,
  symbolCount: number,
  random: SeededRandom,
): FigureSymbolRuleSet[] {
  if (difficulty === "easy") {
    if (symbolCount === 1) {
      return [{
        symbolId: "alpha",
        movement: random.boolean(0.25)
          ? {
              kind: "border",
              direction: random.boolean() ? "clockwise" : "counter_clockwise",
              steps: 1,
              progression: "fixed",
            }
          : {
              kind: "linear",
              direction: random.pick(CARDINAL_DIRECTIONS),
              steps: 1,
              progression: "fixed",
              boundary: "bounce",
            },
      }];
    }
    return [
      {
        symbolId: "alpha",
        movement: {
          kind: "linear",
          direction: random.pick(HORIZONTAL_DIRECTIONS),
          steps: 1,
          progression: "fixed",
          boundary: "bounce",
        },
      },
      {
        symbolId: "beta",
        movement: {
          kind: "linear",
          direction: random.pick(VERTICAL_DIRECTIONS),
          steps: 1,
          progression: "fixed",
          boundary: "bounce",
        },
      },
    ];
  }

  if (difficulty === "medium") {
    const rules: FigureSymbolRuleSet[] = [
      {
        symbolId: "alpha",
        movement: {
          kind: "linear",
          direction: random.pick(HORIZONTAL_DIRECTIONS),
          steps: 1,
          progression: "fixed",
          boundary: "bounce",
        },
        rotation: {
          direction: random.boolean() ? "clockwise" : "counter_clockwise",
          quarterTurns: 1,
          progression: "fixed",
        },
      },
      {
        symbolId: "beta",
        movement: {
          kind: "linear",
          direction: random.pick(VERTICAL_DIRECTIONS),
          steps: 1,
          progression: "fixed",
          boundary: "bounce",
        },
      },
    ];
    if (symbolCount === 3) {
      rules.push({
        symbolId: "gamma",
        movement: {
          kind: "border",
          direction: random.boolean() ? "clockwise" : "counter_clockwise",
          steps: random.pick([1, 2]),
          progression: "fixed",
        },
      });
    }
    return rules;
  }

  const directionCycles = random.boolean()
    ? (["right", "down", "left", "up"] as FigureDirection[])
    : (["down", "left", "up", "right"] as FigureDirection[]);
  const rules: FigureSymbolRuleSet[] = [
    {
      symbolId: "alpha",
      movement: {
        kind: "direction_cycle",
        directions: directionCycles,
        steps: 1,
        progression: "fixed",
        boundary: "bounce",
      },
      rotation: {
        direction: random.boolean() ? "clockwise" : "counter_clockwise",
        quarterTurns: 1,
        progression: "fixed",
      },
    },
    {
      symbolId: "beta",
      movement: {
        kind: "border",
        direction: random.boolean() ? "clockwise" : "counter_clockwise",
        steps: random.pick([1, 2]),
        progression: "fixed",
      },
    },
    {
      symbolId: "gamma",
      movement: {
        kind: "linear",
        direction: random.pick(DIAGONAL_DIRECTIONS),
        steps: 1,
        progression: "incrementing",
        boundary: "bounce",
      },
      colour: {
        cycle: random.boolean()
          ? ["orange", "green", "black"]
          : ["yellow", "pink", "blue"],
        steps: 1,
        progression: "fixed",
      },
    },
  ];
  if (symbolCount === 4) {
    rules.push({
      symbolId: "delta",
      movement: {
        kind: "direction_cycle",
        directions: random.boolean()
          ? ["up", "down_right", "left"]
          : ["left", "up_right", "down"],
        steps: 1,
        progression: "fixed",
        boundary: "bounce",
      },
      rotation: {
        direction: random.boolean() ? "clockwise" : "counter_clockwise",
        quarterTurns: 1,
        progression: "incrementing",
      },
    });
  }
  return rules;
}

function initialShapes(difficulty: Difficulty): FigureShape[] {
  if (difficulty === "easy") return ["arrow", "circle"];
  if (difficulty === "medium") return ["arrow", "square", "diamond"];
  return ["arrow", "diamond", "square", "triangle"];
}

function createSymbols(
  difficulty: Difficulty,
  count: number,
  rules: readonly FigureSymbolRuleSet[],
  random: SeededRandom,
): FigureSymbolState[] {
  const colours = random.shuffle(FIGURE_COLORS.filter((colour) => colour !== "white"));
  const shapes = initialShapes(difficulty);
  const occupied = new Set<string>();
  return IDS.slice(0, count).map((id, index) => {
    const rule = rules.find((item) => item.symbolId === id);
    let position = rule?.movement?.kind === "border"
      ? perimeterPosition(random)
      : { row: random.integer(0, GRID.rows - 1), column: random.integer(0, GRID.columns - 1) };
    for (let retry = 0; occupied.has(`${position.row}:${position.column}`) && retry < 32; retry += 1) {
      position = rule?.movement?.kind === "border"
        ? perimeterPosition(random)
        : { row: random.integer(0, GRID.rows - 1), column: random.integer(0, GRID.columns - 1) };
    }
    if (occupied.has(`${position.row}:${position.column}`)) {
      throw new Error("Unable to place distinct figures in the initial matrix.");
    }
    occupied.add(`${position.row}:${position.column}`);
    const colourCycle = rule?.colour?.cycle;
    const color: FigureColor = colourCycle ? random.pick(colourCycle) : colours[index];
    return {
      id,
      shape: shapes[index],
      color,
      fill: index % 2 === 0 ? "solid" : "outline",
      orientation: random.pick([0, 90, 180, 270]),
      ...position,
    };
  });
}

function createModel(configuration: FigureSequenceGenerationConfiguration, random: SeededRandom) {
  const symbolCount = resolveSymbolCount(configuration, random);
  const rules = createRules(configuration.difficulty, symbolCount, random);
  const symbols = createSymbols(configuration.difficulty, symbolCount, rules, random);
  return { symbols, rules };
}

export class FigureSequenceGenerator implements QuestionGenerator<FigureSequenceGenerationConfiguration, FigureSequenceCandidate> {
  readonly questionType = "figure_sequence" as const;
  readonly version = FIGURE_SEQUENCE_GENERATOR_VERSION;

  generate(configuration: FigureSequenceGenerationConfiguration, attempt: number): FigureSequenceCandidate {
    const random = randomFor(configuration, attempt);
    const model = createModel(configuration, random);
    const frames = replayFigureSequence(GRID, { index: 0, symbols: model.symbols }, model.rules, 5);
    const first = createFigureCandidates(GRID, frames[4], frames[3], model.rules, random.fork("slot-1"), 1);
    const second = createFigureCandidates(GRID, frames[5], frames[4], model.rules, random.fork("slot-2"), 2);
    const missingMatrices: [FigureMissingMatrix, FigureMissingMatrix] = [
      { sequenceIndex: 4, candidates: first.candidates },
      { sequenceIndex: 5, candidates: second.candidates },
    ];
    const structuredData = { grid: GRID, visibleFrames: frames.slice(0, 4), rules: model.rules };
    return {
      questionType: "figure_sequence",
      module: "core",
      topic: "Figure Sequences",
      subtopic: "Independent transformation rules",
      presentation: {
        prompt: "Choose the next two matrices in the sequence.",
        blocks: [{ kind: "diagram", data: { grid: GRID, visibleFrames: frames.slice(0, 4), missingMatrices } }],
      },
      structuredData,
      response: {
        kind: "two_stage_single_choice",
        stages: missingMatrices.map((matrix) => matrix.candidates.map((candidate) => ({
          id: candidate.id,
          label: candidate.label,
          content: { frame: candidate.frame },
        }))) as [never[], never[]],
      },
      correctAnswer: [first.correctCandidateId, second.correctCandidateId],
      explanation: "The independently validated transformation rules determine both missing matrices.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      sequence: { ...structuredData, missingMatrices },
      solutionFrames: [frames[4], frames[5]],
    };
  }
}

export const figureSequenceGenerator = new FigureSequenceGenerator();
