import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";

import type { GenerationDifficulty } from "../types";
import {
  generateBooleanLogicCandidate,
  generateValidatedBooleanLogicUnit,
  solveBooleanLogic,
  validateBooleanLogic,
} from "./boolean-logic";
import {
  generateCombinationalCircuitCandidate,
  generateValidatedCombinationalCircuitUnit,
  solveCombinationalCircuit,
  validateCombinationalCircuit,
} from "./combinational-circuits";

const ENABLED = process.env.DMAT_Q6_STRESS === "1";
const COUNT = Number(process.env.DMAT_Q6_STRESS_COUNT ?? 500);
const DIFFICULTIES: GenerationDifficulty[] = ["easy", "medium", "hard"];

type Row = {
  family: string;
  difficulty: GenerationDifficulty;
  requested: number;
  accepted: number;
  rejectedCandidates: number;
  solverMismatches: number;
  duplicateFingerprints: number;
  duplicateRate: number;
  meanLatencyMs: number;
  p95LatencyMs: number;
  difficultyDistribution: Record<string, number>;
};

type Adapter = {
  family: string;
  generate: (seed: string, difficulty: GenerationDifficulty) => {
    metadata: { attemptCount: number; fingerprint: string; calculatedDifficulty: GenerationDifficulty };
    questions: Array<{ correctOptionId: string }>;
  };
  independentlyValid: (seed: string, difficulty: GenerationDifficulty, attempt: number) => boolean;
  solvedIds: (seed: string, difficulty: GenerationDifficulty, attempt: number) => string[];
};

const adapters: Adapter[] = [
  {
    family: "boolean_truth_tables",
    generate: (seed, difficulty) => generateValidatedBooleanLogicUnit({ seed, difficulty }),
    independentlyValid: (seed, difficulty, attempt) => validateBooleanLogic(generateBooleanLogicCandidate({ seed, difficulty }, attempt), difficulty).valid,
    solvedIds: (seed, difficulty, attempt) => solveBooleanLogic(generateBooleanLogicCandidate({ seed, difficulty }, attempt)).correctOptionIds,
  },
  {
    family: "combinational_circuits",
    generate: (seed, difficulty) => generateValidatedCombinationalCircuitUnit({ seed, difficulty }),
    independentlyValid: (seed, difficulty, attempt) => validateCombinationalCircuit(generateCombinationalCircuitCandidate({ seed, difficulty }, attempt), difficulty).valid,
    solvedIds: (seed, difficulty, attempt) => solveCombinationalCircuit(generateCombinationalCircuitCandidate({ seed, difficulty }, attempt)).correctOptionIds,
  },
];

async function audit(adapter: Adapter, difficulty: GenerationDifficulty): Promise<Row> {
  const fingerprints = new Set<string>();
  const latencies: number[] = [];
  const distribution: Record<string, number> = {};
  let rejectedCandidates = 0;
  let solverMismatches = 0;
  let duplicateFingerprints = 0;
  for (let index = 0; index < COUNT; index += 1) {
    if (index > 0 && index % 100 === 0) await new Promise<void>((resolve) => setImmediate(resolve));
    const seed = `q6:${adapter.family}:${difficulty}:${index}`;
    const started = performance.now();
    const unit = adapter.generate(seed, difficulty);
    latencies.push(performance.now() - started);
    rejectedCandidates += unit.metadata.attemptCount - 1;
    if (fingerprints.has(unit.metadata.fingerprint)) duplicateFingerprints += 1;
    fingerprints.add(unit.metadata.fingerprint);
    const valid = adapter.independentlyValid(seed, difficulty, unit.metadata.attemptCount);
    const solved = adapter.solvedIds(seed, difficulty, unit.metadata.attemptCount);
    if (!valid || JSON.stringify(solved) !== JSON.stringify(unit.questions.map((question) => question.correctOptionId))) solverMismatches += 1;
    distribution[unit.metadata.calculatedDifficulty] = (distribution[unit.metadata.calculatedDifficulty] ?? 0) + 1;
  }
  latencies.sort((a, b) => a - b);
  return {
    family: adapter.family,
    difficulty,
    requested: COUNT,
    accepted: COUNT,
    rejectedCandidates,
    solverMismatches,
    duplicateFingerprints,
    duplicateRate: duplicateFingerprints / COUNT,
    meanLatencyMs: latencies.reduce((sum, value) => sum + value, 0) / COUNT,
    p95LatencyMs: latencies[Math.max(0, Math.ceil(COUNT * 0.95) - 1)] ?? 0,
    difficultyDistribution: distribution,
  };
}

describe.skipIf(!ENABLED)("Q6 Computer Science family stress audit", () => {
  const rows: Row[] = [];
  if (!Number.isSafeInteger(COUNT) || COUNT < 1 || COUNT > 10_000) throw new RangeError("DMAT_Q6_STRESS_COUNT must be from 1 through 10000.");
  adapters.forEach((adapter) => DIFFICULTIES.forEach((difficulty) => {
    it(`${adapter.family} ${difficulty}`, async () => {
      const row = await audit(adapter, difficulty);
      rows.push(row);
      expect(row.solverMismatches).toBe(0);
      expect(row.difficultyDistribution[difficulty]).toBe(COUNT);
    }, 300_000);
  }));

  it("records the report", () => {
    const directory = join(process.cwd(), "reports", "q6");
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "computer-science-stress.json"), `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), seedsPerDifficulty: COUNT, rows }, null, 2)}\n`, "utf8");
    expect(rows).toHaveLength(adapters.length * DIFFICULTIES.length);
  });
});
