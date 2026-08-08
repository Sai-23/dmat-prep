import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_GENERATOR_VERSION,
  LATIN_SQUARE_SIZE,
  type CompletedLatinGrid,
  type LatinCoordinate,
  type LatinSquareCandidate,
  type LatinSquareGenerationConfiguration,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "./types";

const PROVISIONAL_CLUE_RANGES = {
  easy: { minimum: 14, maximum: 17 },
  medium: { minimum: 10, maximum: 13 },
  hard: { minimum: 7, maximum: 9 },
} as const;

const ESTIMATED_SECONDS = { easy: 55, medium: 75, hard: 100 } as const;

function createRandom(
  configuration: LatinSquareGenerationConfiguration,
  attempt: number,
): SeededRandom {
  if (!configuration.seed.trim()) {
    throw new Error("A non-empty Latin-square seed is required.");
  }
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new RangeError("Generation attempt must be a positive safe integer.");
  }
  return new SeededRandom(
    `${LATIN_SQUARE_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`,
  );
}

function completedSquare(random: SeededRandom): CompletedLatinGrid {
  const rowOrder = random.shuffle([0, 1, 2, 3, 4]);
  const columnOrder = random.shuffle([0, 1, 2, 3, 4]);
  const symbols = random.shuffle(DEFAULT_LATIN_SYMBOLS) as LatinSymbol[];
  return rowOrder.map((row) =>
    columnOrder.map((column) => symbols[(row + column) % LATIN_SQUARE_SIZE]),
  );
}

function coordinateKey({ row, column }: LatinCoordinate): string {
  return `${row}:${column}`;
}

function selectClues(
  target: LatinCoordinate,
  clueCount: number,
  random: SeededRandom,
): LatinCoordinate[] {
  const selected = new Map<string, LatinCoordinate>();

  const targetDiagonalOffset =
    (target.column - target.row + LATIN_SQUARE_SIZE) % LATIN_SQUARE_SIZE;
  const availableOffsets = [0, 1, 2, 3, 4].filter(
    (offset) => offset !== targetDiagonalOffset,
  );
  const coverageOffset = random.pick(availableOffsets);
  for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
    const coordinate = {
      row,
      column: (row + coverageOffset) % LATIN_SQUARE_SIZE,
    };
    selected.set(coordinateKey(coordinate), coordinate);
  }

  const remaining = random.shuffle(
    Array.from({ length: LATIN_SQUARE_SIZE * LATIN_SQUARE_SIZE }, (_, index) => ({
      row: Math.floor(index / LATIN_SQUARE_SIZE),
      column: index % LATIN_SQUARE_SIZE,
    })).filter((coordinate) => coordinateKey(coordinate) !== coordinateKey(target)),
  );
  for (const coordinate of remaining) {
    if (selected.size >= clueCount) break;
    selected.set(coordinateKey(coordinate), coordinate);
  }
  return [...selected.values()];
}

function visibleGrid(
  completed: CompletedLatinGrid,
  clues: readonly LatinCoordinate[],
): VisibleLatinGrid {
  const clueKeys = new Set(clues.map(coordinateKey));
  return completed.map((row, rowIndex) =>
    row.map((symbol, columnIndex) =>
      clueKeys.has(coordinateKey({ row: rowIndex, column: columnIndex }))
        ? symbol
        : null,
    ),
  );
}

export class LatinSquareGenerator
  implements
    QuestionGenerator<LatinSquareGenerationConfiguration, LatinSquareCandidate>
{
  readonly questionType = "latin_square" as const;
  readonly version = LATIN_SQUARE_GENERATOR_VERSION;

  generate(
    configuration: LatinSquareGenerationConfiguration,
    attempt: number,
  ): LatinSquareCandidate {
    const random = createRandom(configuration, attempt);
    const completedGrid = completedSquare(random);
    const target: LatinCoordinate = {
      row: random.integer(0, LATIN_SQUARE_SIZE - 1),
      column: random.integer(0, LATIN_SQUARE_SIZE - 1),
    };
    const range = PROVISIONAL_CLUE_RANGES[configuration.difficulty];
    const clueCount = random.integer(range.minimum, range.maximum);
    const clues = selectClues(target, clueCount, random);
    const grid = visibleGrid(completedGrid, clues);
    const correctAnswer = completedGrid[target.row][target.column];

    return {
      questionType: "latin_square",
      module: "core",
      topic: "Latin Squares",
      subtopic: "Row and column deduction",
      presentation: {
        prompt: "Which letter belongs in the cell marked with a question mark?",
        blocks: [
          {
            kind: "diagram",
            data: { size: LATIN_SQUARE_SIZE, grid, target },
          },
        ],
      },
      structuredData: {
        size: LATIN_SQUARE_SIZE,
        symbols: [...DEFAULT_LATIN_SYMBOLS],
        grid,
        target,
      },
      response: {
        kind: "single_choice",
        options: DEFAULT_LATIN_SYMBOLS.map((symbol) => ({
          id: symbol,
          label: symbol,
          content: symbol,
        })),
      },
      correctAnswer,
      explanation:
        `Applying the row and column constraints determines ${correctAnswer} at the target cell. ` +
        "A deduction trace must be independently established in G7.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      completedGrid,
    };
  }
}

export const latinSquareGenerator = new LatinSquareGenerator();

