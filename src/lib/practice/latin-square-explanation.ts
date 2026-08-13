import {
  DEFAULT_LATIN_SYMBOLS,
  LATIN_SQUARE_SIZE,
  type CompletedLatinGrid,
  type LatinCoordinate,
  type LatinDeduction,
  type LatinDeductionReason,
  type LatinSquareStructuredData,
  type LatinSymbol,
  type VisibleLatinGrid,
} from "../generation/latin-squares";

export type LatinExplanationStepType =
  | "intermediate"
  | "target_row"
  | "target_column"
  | "compare"
  | "resolve_target"
  | "final";

export type LatinExplanationStep = {
  id: string;
  type: LatinExplanationStepType;
  eyebrow: string;
  title: string;
  coordinate: LatinCoordinate;
  symbol: LatinSymbol;
  highlightRow: boolean;
  highlightColumn: boolean;
  rowExisting: LatinSymbol[];
  columnExisting: LatinSymbol[];
  rowCandidates: LatinSymbol[];
  columnCandidates: LatinSymbol[];
  commonCandidates: LatinSymbol[];
  previewGrid: VisibleLatinGrid;
  placementScope: "row" | "column" | null;
  placementOptions: LatinCoordinate[];
  isTarget: boolean;
};

export type LatinWalkthroughSummary = {
  target: LatinCoordinate;
  answer: LatinSymbol;
  rowCandidates: LatinSymbol[];
  columnCandidates: LatinSymbol[];
  commonCandidates: LatinSymbol[];
  finalReason: "intersection" | "only_position_in_row" | "only_position_in_column";
};

export type LatinWalkthrough = {
  valid: boolean;
  steps: LatinExplanationStep[];
  completedGrid: CompletedLatinGrid | null;
  summary: LatinWalkthroughSummary | null;
  fallbackMessage: string | null;
};

const coordinateKey = ({ row, column }: LatinCoordinate) => `${row}:${column}`;
const sameCoordinate = (first: LatinCoordinate, second: LatinCoordinate) =>
  first.row === second.row && first.column === second.column;

function isCoordinate(value: unknown): value is LatinCoordinate {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const coordinate = value as Record<string, unknown>;
  return Number.isInteger(coordinate.row) &&
    Number.isInteger(coordinate.column) &&
    Number(coordinate.row) >= 0 &&
    Number(coordinate.row) < LATIN_SQUARE_SIZE &&
    Number(coordinate.column) >= 0 &&
    Number(coordinate.column) < LATIN_SQUARE_SIZE;
}

function isLatinSymbol(value: unknown): value is LatinSymbol {
  return typeof value === "string" && DEFAULT_LATIN_SYMBOLS.includes(value as LatinSymbol);
}

function parseDeduction(value: unknown): LatinDeduction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const deduction = value as Record<string, unknown>;
  const reasons: LatinDeductionReason[] = [
    "single_candidate",
    "only_position_in_row",
    "only_position_in_column",
  ];
  if (
    !isCoordinate(deduction.coordinate) ||
    !isLatinSymbol(deduction.symbol) ||
    !reasons.includes(deduction.reason as LatinDeductionReason) ||
    !Number.isInteger(deduction.round) ||
    !Number.isInteger(deduction.depth) ||
    (deduction.dependencies !== undefined &&
      (!Array.isArray(deduction.dependencies) || !deduction.dependencies.every(isCoordinate)))
  ) return null;
  return {
    coordinate: deduction.coordinate,
    symbol: deduction.symbol,
    reason: deduction.reason as LatinDeductionReason,
    round: Number(deduction.round),
    depth: Number(deduction.depth),
    dependencies: Array.isArray(deduction.dependencies) ? deduction.dependencies : [],
  };
}

function candidatesFor(grid: VisibleLatinGrid, coordinate: LatinCoordinate): LatinSymbol[] {
  if (grid[coordinate.row]?.[coordinate.column] !== null) return [];
  const used = new Set<LatinSymbol>();
  for (const symbol of grid[coordinate.row]) if (symbol !== null) used.add(symbol);
  for (const row of grid) {
    const symbol = row[coordinate.column];
    if (symbol !== null) used.add(symbol);
  }
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !used.has(symbol));
}

function rowCandidates(grid: VisibleLatinGrid, row: number): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => !grid[row].includes(symbol));
}

function columnCandidates(grid: VisibleLatinGrid, column: number): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) =>
    !grid.some((row) => row[column] === symbol),
  );
}

function presentSymbols(values: Array<LatinSymbol | null>): LatinSymbol[] {
  return DEFAULT_LATIN_SYMBOLS.filter((symbol) => values.includes(symbol));
}

function intersect(first: readonly LatinSymbol[], second: readonly LatinSymbol[]): LatinSymbol[] {
  const secondSet = new Set(second);
  return first.filter((symbol) => secondSet.has(symbol));
}

function placementOptions(
  grid: VisibleLatinGrid,
  deduction: LatinDeduction,
): LatinCoordinate[] {
  if (deduction.reason === "only_position_in_row") {
    return Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) => ({
      row: deduction.coordinate.row,
      column,
    })).filter((coordinate) => candidatesFor(grid, coordinate).includes(deduction.symbol));
  }
  if (deduction.reason === "only_position_in_column") {
    return Array.from({ length: LATIN_SQUARE_SIZE }, (_, row) => ({
      row,
      column: deduction.coordinate.column,
    })).filter((coordinate) => candidatesFor(grid, coordinate).includes(deduction.symbol));
  }
  return [];
}

function deductionIsValid(grid: VisibleLatinGrid, deduction: LatinDeduction): boolean {
  const candidates = candidatesFor(grid, deduction.coordinate);
  if (!candidates.includes(deduction.symbol)) return false;
  if (deduction.reason === "single_candidate") return candidates.length === 1;
  const options = placementOptions(grid, deduction);
  return options.length === 1 && sameCoordinate(options[0], deduction.coordinate);
}

function targetClosure(
  deductions: readonly LatinDeduction[],
  target: LatinCoordinate,
): Set<string> | null {
  const byCoordinate = new Map<string, LatinDeduction>();
  for (const deduction of deductions) {
    const key = coordinateKey(deduction.coordinate);
    if (byCoordinate.has(key)) return null;
    byCoordinate.set(key, deduction);
  }
  if (!byCoordinate.has(coordinateKey(target))) return null;
  const closure = new Set<string>();
  const visiting = new Set<string>();
  const visit = (coordinate: LatinCoordinate): boolean => {
    const key = coordinateKey(coordinate);
    if (closure.has(key)) return true;
    if (visiting.has(key)) return false;
    const deduction = byCoordinate.get(key);
    if (!deduction) return false;
    visiting.add(key);
    for (const dependency of deduction.dependencies) {
      if (!visit(dependency)) return false;
    }
    visiting.delete(key);
    closure.add(key);
    return true;
  };
  return visit(target) ? closure : null;
}

function dependenciesAreOrdered(deductions: readonly LatinDeduction[]): boolean {
  const indices = new Map<string, number>();
  for (let index = 0; index < deductions.length; index += 1) {
    const key = coordinateKey(deductions[index].coordinate);
    if (indices.has(key)) return false;
    indices.set(key, index);
  }
  return deductions.every((deduction, index) =>
    deduction.dependencies.every((dependency) => {
      const dependencyIndex = indices.get(coordinateKey(dependency));
      return dependencyIndex !== undefined && dependencyIndex < index;
    }),
  );
}

function proofIsValid(
  originalGrid: VisibleLatinGrid,
  deductions: readonly LatinDeduction[],
  selectedIndices: ReadonlySet<number>,
  targetIndex: number,
): boolean {
  const grid = originalGrid.map((row) => [...row]);
  for (let index = 0; index <= targetIndex; index += 1) {
    if (index !== targetIndex && !selectedIndices.has(index)) continue;
    const deduction = deductions[index];
    if (!deductionIsValid(grid, deduction)) return false;
    grid[deduction.coordinate.row][deduction.coordinate.column] = deduction.symbol;
  }
  return true;
}

function combinations(values: number[], count: number): number[][] {
  if (count === 0) return [[]];
  if (count > values.length) return [];
  const result: number[][] = [];
  const build = (start: number, chosen: number[]) => {
    if (chosen.length === count) {
      result.push([...chosen]);
      return;
    }
    for (let index = start; index <= values.length - (count - chosen.length); index += 1) {
      chosen.push(values[index]);
      build(index + 1, chosen);
      chosen.pop();
    }
  };
  build(0, []);
  return result;
}

function conciseProofIndices(
  originalGrid: VisibleLatinGrid,
  deductions: readonly LatinDeduction[],
  targetIndex: number,
  closure: ReadonlySet<string>,
): number[] | null {
  const eligible = deductions
    .map((deduction, index) => ({ deduction, index }))
    .filter(({ deduction, index }) =>
      index < targetIndex && closure.has(coordinateKey(deduction.coordinate)),
    )
    .map(({ index }) => index);
  for (let count = 0; count <= eligible.length; count += 1) {
    for (const selection of combinations(eligible, count)) {
      if (proofIsValid(originalGrid, deductions, new Set(selection), targetIndex)) {
        return [...selection, targetIndex];
      }
    }
  }
  return null;
}

function completedGrid(
  data: LatinSquareStructuredData,
  answer: LatinSymbol,
): CompletedLatinGrid | null {
  const grid = data.grid.map((row) => [...row]);
  if (
    grid.length !== LATIN_SQUARE_SIZE ||
    grid.some((row) => row.length !== LATIN_SQUARE_SIZE) ||
    grid[data.target.row]?.[data.target.column] !== null ||
    !candidatesFor(grid, data.target).includes(answer)
  ) return null;
  grid[data.target.row][data.target.column] = answer;

  const solve = (): boolean => {
    let next: { coordinate: LatinCoordinate; candidates: LatinSymbol[] } | null = null;
    for (let row = 0; row < LATIN_SQUARE_SIZE; row += 1) {
      for (let column = 0; column < LATIN_SQUARE_SIZE; column += 1) {
        if (grid[row][column] !== null) continue;
        const coordinate = { row, column };
        const candidates = candidatesFor(grid, coordinate);
        if (!candidates.length) return false;
        if (!next || candidates.length < next.candidates.length) {
          next = { coordinate, candidates };
        }
      }
    }
    if (!next) return true;
    const { coordinate, candidates } = next;
    for (const symbol of candidates) {
      grid[coordinate.row][coordinate.column] = symbol;
      if (solve()) return true;
      grid[coordinate.row][coordinate.column] = null;
    }
    return false;
  };

  if (!solve()) return null;
  const expected = [...DEFAULT_LATIN_SYMBOLS].sort().join("");
  const valid = grid.every((row) => [...row].sort().join("") === expected) &&
    Array.from({ length: LATIN_SQUARE_SIZE }, (_, column) =>
      grid.map((row) => row[column]).sort().join(""),
    ).every((column) => column === expected);
  return valid ? grid as CompletedLatinGrid : null;
}

function baseStep(
  type: LatinExplanationStepType,
  coordinate: LatinCoordinate,
  symbol: LatinSymbol,
  grid: VisibleLatinGrid,
): Omit<LatinExplanationStep, "id" | "eyebrow" | "title" | "highlightRow" | "highlightColumn" | "placementScope" | "placementOptions" | "isTarget"> {
  const rowOptions = rowCandidates(grid, coordinate.row);
  const columnOptions = columnCandidates(grid, coordinate.column);
  return {
    type,
    coordinate,
    symbol,
    rowExisting: presentSymbols(grid[coordinate.row]),
    columnExisting: presentSymbols(grid.map((row) => row[coordinate.column])),
    rowCandidates: rowOptions,
    columnCandidates: columnOptions,
    commonCandidates: intersect(rowOptions, columnOptions),
    previewGrid: grid.map((row) => [...row]),
  };
}

function intermediateStep(
  grid: VisibleLatinGrid,
  deduction: LatinDeduction,
  index: number,
): LatinExplanationStep {
  const row = deduction.coordinate.row + 1;
  const column = deduction.coordinate.column + 1;
  const scope = deduction.reason === "only_position_in_row"
    ? "row" as const
    : deduction.reason === "only_position_in_column"
      ? "column" as const
      : null;
  const previewGrid = grid.map((values) => [...values]);
  previewGrid[deduction.coordinate.row][deduction.coordinate.column] = deduction.symbol;
  return {
    ...baseStep("intermediate", deduction.coordinate, deduction.symbol, grid),
    id: `intermediate:${index}:${coordinateKey(deduction.coordinate)}`,
    eyebrow: "USEFUL STEP",
    title: `Fill Row ${row}, Column ${column}`,
    highlightRow: deduction.reason !== "only_position_in_column",
    highlightColumn: deduction.reason !== "only_position_in_row",
    previewGrid,
    placementScope: scope,
    placementOptions: placementOptions(grid, deduction),
    isTarget: false,
  };
}

function targetSteps(
  grid: VisibleLatinGrid,
  deduction: LatinDeduction,
): { steps: LatinExplanationStep[]; summary: LatinWalkthroughSummary } | null {
  const target = deduction.coordinate;
  const row = target.row + 1;
  const column = target.column + 1;
  const common = candidatesFor(grid, target);
  if (!common.includes(deduction.symbol)) return null;
  const commonBase = baseStep("target_row", target, deduction.symbol, grid);
  const steps: LatinExplanationStep[] = [
    {
      ...commonBase,
      id: "target-row",
      type: "target_row",
      eyebrow: "LOOK AT THE ROW",
      title: `Look at Row ${row}`,
      highlightRow: true,
      highlightColumn: false,
      placementScope: null,
      placementOptions: [],
      isTarget: true,
    },
    {
      ...commonBase,
      id: "target-column",
      type: "target_column",
      eyebrow: "CHECK THE COLUMN",
      title: `Check Column ${column}`,
      highlightRow: false,
      highlightColumn: true,
      placementScope: null,
      placementOptions: [],
      isTarget: true,
    },
    {
      ...commonBase,
      id: "compare-options",
      type: "compare",
      eyebrow: "COMPARE THE TWO SETS",
      title: `Compare Row ${row} and Column ${column}`,
      highlightRow: true,
      highlightColumn: true,
      placementScope: null,
      placementOptions: [],
      isTarget: true,
    },
  ];
  let finalReason: LatinWalkthroughSummary["finalReason"] = "intersection";
  if (common.length > 1) {
    if (deduction.reason === "single_candidate") return null;
    const options = placementOptions(grid, deduction);
    if (options.length !== 1 || !sameCoordinate(options[0], target)) return null;
    finalReason = deduction.reason;
    const scope = deduction.reason === "only_position_in_row" ? "row" : "column";
    steps.push({
      ...commonBase,
      id: "resolve-target",
      type: "resolve_target",
      eyebrow: "ONE LAST CHECK",
      title: deduction.reason === "only_position_in_row"
        ? `Find where ${deduction.symbol} fits in Row ${row}`
        : `Find where ${deduction.symbol} fits in Column ${column}`,
      highlightRow: scope === "row",
      highlightColumn: scope === "column",
      placementScope: scope,
      placementOptions: options,
      isTarget: true,
    });
  }
  const finalGrid = grid.map((values) => [...values]);
  finalGrid[target.row][target.column] = deduction.symbol;
  steps.push({
    ...commonBase,
    id: "final-answer",
    type: "final",
    eyebrow: "FINAL ANSWER",
    title: `So, the ? cell is ${deduction.symbol}`,
    highlightRow: true,
    highlightColumn: false,
    previewGrid: finalGrid,
    placementScope: null,
    placementOptions: [],
    isTarget: true,
  });
  return {
    steps,
    summary: {
      target,
      answer: deduction.symbol,
      rowCandidates: commonBase.rowCandidates,
      columnCandidates: commonBase.columnCandidates,
      commonCandidates: commonBase.commonCandidates,
      finalReason,
    },
  };
}

function fallback(answer: LatinSymbol, solution: CompletedLatinGrid | null): LatinWalkthrough {
  return {
    valid: false,
    steps: [],
    completedGrid: solution,
    summary: null,
    fallbackMessage: `The verified answer is ${answer}. A detailed walkthrough is unavailable for this question.`,
  };
}

export function buildLatinSquareWalkthrough(
  data: LatinSquareStructuredData,
  rawTrace: unknown,
  correctAnswer: unknown,
): LatinWalkthrough {
  if (!isLatinSymbol(correctAnswer)) {
    return {
      valid: false,
      steps: [],
      completedGrid: null,
      summary: null,
      fallbackMessage: "The verified answer is unavailable.",
    };
  }
  const solution = completedGrid(data, correctAnswer);
  if (!solution) return fallback(correctAnswer, null);

  let trace: LatinDeduction[];
  let proofIndices: number[] | null = null;
  if (Array.isArray(rawTrace)) {
    const parsed = rawTrace.map(parseDeduction);
    if (parsed.some((deduction) => deduction === null)) return fallback(correctAnswer, solution);
    trace = parsed as LatinDeduction[];
    const targetIndex = trace.findIndex((deduction) => sameCoordinate(deduction.coordinate, data.target));
    const hasDependencies = rawTrace.every((value) =>
      Boolean(value) && typeof value === "object" && !Array.isArray(value) &&
      Array.isArray((value as Record<string, unknown>).dependencies),
    );
    const closure = hasDependencies ? targetClosure(trace, data.target) : null;
    const scope = closure ?? new Set(
      trace.slice(0, targetIndex + 1).map((deduction) => coordinateKey(deduction.coordinate)),
    );
    if (
      targetIndex < 0 ||
      (hasDependencies && !closure) ||
      !dependenciesAreOrdered(trace) ||
      trace[targetIndex].symbol !== correctAnswer
    ) return fallback(correctAnswer, solution);
    proofIndices = conciseProofIndices(data.grid, trace, targetIndex, scope);
  } else {
    const direct: LatinDeduction = {
      coordinate: data.target,
      symbol: correctAnswer,
      reason: "single_candidate",
      round: 1,
      depth: 1,
      dependencies: [],
    };
    trace = [direct];
    proofIndices = deductionIsValid(data.grid, direct) ? [0] : null;
  }
  if (!proofIndices) return fallback(correctAnswer, solution);

  const grid = data.grid.map((row) => [...row]);
  const steps: LatinExplanationStep[] = [];
  for (const [proofIndex, traceIndex] of proofIndices.entries()) {
    const deduction = trace[traceIndex];
    if (!deductionIsValid(grid, deduction) || solution[deduction.coordinate.row][deduction.coordinate.column] !== deduction.symbol) {
      return fallback(correctAnswer, solution);
    }
    const isTarget = sameCoordinate(deduction.coordinate, data.target);
    if (isTarget) {
      const targetPresentation = targetSteps(grid, deduction);
      if (!targetPresentation || proofIndex !== proofIndices.length - 1) {
        return fallback(correctAnswer, solution);
      }
      return {
        valid: true,
        steps: [...steps, ...targetPresentation.steps],
        completedGrid: solution,
        summary: targetPresentation.summary,
        fallbackMessage: null,
      };
    }
    steps.push(intermediateStep(grid, deduction, proofIndex));
    grid[deduction.coordinate.row][deduction.coordinate.column] = deduction.symbol;
  }
  return fallback(correctAnswer, solution);
}
