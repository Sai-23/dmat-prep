import { canonicalize, createFingerprint } from "../fingerprint";
import { SeededRandom } from "../random";
import type { GenerationDifficulty, ValidationCheck, ValidationIssue, ValidationResult } from "../types";
import { validateComputerScienceSubjectUnit } from "./validation";
import {
  COMBINATIONAL_CIRCUIT_GENERATOR_VERSION,
  COMBINATIONAL_CIRCUIT_SOLVER_VERSION,
  COMBINATIONAL_CIRCUIT_VALIDATOR_VERSION,
  type BooleanAssignment,
  type CircuitGate,
  type CombinationalCircuitDifficultyMetrics,
  type CombinationalCircuitGeneratedUnit,
  type CombinationalCircuitGenerationConfiguration,
  type CombinationalCircuitSolution,
  type CombinationalCircuitUnitCandidate,
  type ComputerScienceAnswerOption,
} from "./types";

const ESTIMATED_SECONDS = { easy: 55, medium: 85, hard: 120 } as const;
const BINARY_OPERATORS = ["and", "or", "xor"] as const;
const SIGNATURES = ["FF", "FT", "TF", "TT"];

function gateValue(gate: CircuitGate, values: Readonly<Record<string, boolean>>): boolean {
  const inputs = gate.inputs.map((input) => {
    if (!(input in values)) throw new Error(`Gate ${gate.id} references unavailable signal ${input}.`);
    return values[input];
  });
  if (gate.operator === "not") {
    if (inputs.length !== 1) throw new Error(`NOT gate ${gate.id} must have one input.`);
    return !inputs[0];
  }
  if (inputs.length !== 2) throw new Error(`${gate.operator.toUpperCase()} gate ${gate.id} must have two inputs.`);
  if (gate.operator === "and") return inputs[0] && inputs[1];
  if (gate.operator === "or") return inputs[0] || inputs[1];
  return inputs[0] !== inputs[1];
}

export function evaluateCombinationalCircuit(
  candidate: CombinationalCircuitUnitCandidate,
  assignment: BooleanAssignment,
): { signature: string; values: Record<string, boolean> } {
  const values: Record<string, boolean> = { ...assignment };
  for (const gate of candidate.structuredData.gates) values[gate.id] = gateValue(gate, values);
  const signature = candidate.structuredData.outputs.map((output) => {
    if (!(output in values)) throw new Error(`Output references unavailable signal ${output}.`);
    return values[output] ? "T" : "F";
  }).join("");
  return { signature, values };
}

function circuitDepth(inputs: string[], gates: CircuitGate[]): number {
  const depths: Record<string, number> = Object.fromEntries(inputs.map((input) => [input, 0]));
  for (const gate of gates) {
    const dependencies = gate.inputs.map((input) => depths[input]);
    if (dependencies.some((depth) => depth === undefined)) throw new Error(`Gate ${gate.id} has a forward or missing reference.`);
    depths[gate.id] = Math.max(...dependencies) + 1;
  }
  return Math.max(0, ...gates.map((gate) => depths[gate.id]));
}

export function calculateCombinationalCircuitDifficulty(candidate: CombinationalCircuitUnitCandidate): {
  difficulty: GenerationDifficulty;
  metrics: CombinationalCircuitDifficultyMetrics;
} {
  const inputCount = candidate.structuredData.inputs.length;
  const gateCount = candidate.structuredData.gates.length;
  const maximumDepth = circuitDepth(candidate.structuredData.inputs, candidate.structuredData.gates);
  const score = inputCount + gateCount + maximumDepth * 2;
  return {
    difficulty: score <= 8 ? "easy" : score <= 14 ? "medium" : "hard",
    metrics: { inputCount, gateCount, maximumDepth, score },
  };
}

function operator(random: SeededRandom, offset: number): (typeof BINARY_OPERATORS)[number] {
  return BINARY_OPERATORS[(random.integer(0, BINARY_OPERATORS.length - 1) + offset) % BINARY_OPERATORS.length];
}

function circuitFor(difficulty: GenerationDifficulty, random: SeededRandom): { inputs: string[]; gates: CircuitGate[]; outputs: [string, string] } {
  if (difficulty === "easy") return {
    inputs: ["A", "B"],
    gates: [
      { id: "G1", operator: operator(random, 0), inputs: ["A", "B"] },
      { id: "G2", operator: "not", inputs: ["G1"] },
    ],
    outputs: ["G1", "G2"],
  };
  if (difficulty === "medium") return {
    inputs: ["A", "B", "C"],
    gates: [
      { id: "G1", operator: operator(random, 0), inputs: ["A", "B"] },
      { id: "G2", operator: operator(random, 1), inputs: ["B", "C"] },
      { id: "G3", operator: operator(random, 2), inputs: ["G1", "G2"] },
      { id: "G4", operator: "not", inputs: ["G2"] },
    ],
    outputs: ["G3", "G4"],
  };
  return {
    inputs: ["A", "B", "C", "D"],
    gates: [
      { id: "G1", operator: operator(random, 0), inputs: ["A", "B"] },
      { id: "G2", operator: operator(random, 1), inputs: ["C", "D"] },
      { id: "G3", operator: "not", inputs: ["G1"] },
      { id: "G4", operator: operator(random, 2), inputs: ["G2", "G3"] },
      { id: "G5", operator: operator(random, 1), inputs: ["G1", "G4"] },
      { id: "G6", operator: "not", inputs: ["G4"] },
    ],
    outputs: ["G5", "G6"],
  };
}

function scenariosFor(inputs: string[], random: SeededRandom): Array<{ id: string; assignment: BooleanAssignment }> {
  const rows = Array.from({ length: 2 ** inputs.length }, (_, row) => ({
    id: "",
    assignment: Object.fromEntries(inputs.map((input, index) => [input, Boolean(row & (1 << (inputs.length - index - 1)))])),
  }));
  return random.shuffle(rows).slice(0, 2).map((scenario, index) => ({ ...scenario, id: `S${index + 1}` }));
}

function optionsFor(correct: string, random: SeededRandom, index: number): [ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption] {
  return random.shuffle(SIGNATURES).map((content, optionIndex) => ({
    id: `q${index + 1}-option-${optionIndex + 1}`,
    label: String.fromCharCode(65 + optionIndex),
    content,
  })) as [ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption, ComputerScienceAnswerOption];
}

export function generateCombinationalCircuitCandidate(configuration: CombinationalCircuitGenerationConfiguration, attempt: number): CombinationalCircuitUnitCandidate {
  if (!configuration.seed.trim()) throw new Error("A non-empty combinational-circuit seed is required.");
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("Generation attempt must be positive.");
  const random = new SeededRandom(`${COMBINATIONAL_CIRCUIT_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`);
  const circuit = circuitFor(configuration.difficulty, random.fork("circuit"));
  const scenarios = scenariosFor(circuit.inputs, random.fork("scenarios"));
  const shell = { schemaVersion: 1 as const, module: "computer_science" as const, subject: "computer_science" as const, topic: "Combinational Circuits", family: "combinational_circuits" as const };
  const structuredData = { family: "combinational_circuits" as const, ...circuit, scenarios };
  const candidateBase = { ...shell, structuredData } as CombinationalCircuitUnitCandidate;
  const questions = scenarios.map((scenario, index) => {
    const correct = evaluateCombinationalCircuit(candidateBase, scenario.assignment).signature;
    const options = optionsFor(correct, random.fork(`options-${index}`), index);
    return {
      id: `question-${index + 1}`,
      topic: "Combinational Circuits",
      subtopic: "Circuit tracing",
      difficulty: configuration.difficulty,
      prompt: `For input scenario ${scenario.id}, what are outputs Y1Y2?`,
      blocks: [{ kind: "table" as const, data: { headers: circuit.inputs, rows: [circuit.inputs.map((input) => scenario.assignment[input] ? "T" : "F")] } }],
      options,
      correctOptionId: options.find((option) => option.content === correct)!.id,
      explanation: "The independent circuit evaluator must compute every gate in dependency order.",
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
    };
  });
  return {
    ...shell,
    stimulus: {
      id: "circuit-stimulus",
      title: "Trace the combinational circuit",
      blocks: [
        { kind: "text", text: "Gate outputs are evaluated from G1 downward. Y1 and Y2 are the two listed output signals." },
        { kind: "diagram", data: { inputs: circuit.inputs, gates: circuit.gates, outputs: { Y1: circuit.outputs[0], Y2: circuit.outputs[1] } } },
      ],
    },
    questions,
    structuredData,
  };
}

export function solveCombinationalCircuit(candidate: CombinationalCircuitUnitCandidate): Pick<CombinationalCircuitSolution, "outputSignatures" | "correctOptionIds"> {
  const outputSignatures = candidate.structuredData.scenarios.map((scenario) => evaluateCombinationalCircuit(candidate, scenario.assignment).signature);
  const correctOptionIds = outputSignatures.map((signature, index) => {
    const matches = candidate.questions[index]?.options.filter((option) => option.content === signature) ?? [];
    if (matches.length !== 1) throw new Error(`Question ${index + 1} does not contain exactly one evaluated circuit output.`);
    return matches[0].id;
  });
  return { outputSignatures, correctOptionIds };
}

function check(stage: ValidationCheck["stage"], passed: boolean, details?: ValidationCheck["details"]): ValidationCheck {
  return { stage, passed, validatorVersion: COMBINATIONAL_CIRCUIT_VALIDATOR_VERSION, ...(details === undefined ? {} : { details }) };
}

export function validateCombinationalCircuit(candidate: CombinationalCircuitUnitCandidate, requestedDifficulty: GenerationDifficulty): ValidationResult<CombinationalCircuitSolution> {
  const structural = validateComputerScienceSubjectUnit(candidate);
  const checks = structural.checks.map((item) => ({ ...item, validatorVersion: COMBINATIONAL_CIRCUIT_VALIDATOR_VERSION }));
  if (!structural.valid || candidate.structuredData.family !== "combinational_circuits") return { valid: false, issues: structural.valid ? [{ stage: "format", code: "circuit_family_mismatch", message: "The unit is not a combinational-circuit family." }] : structural.issues, checks };
  const { inputs, gates, outputs, scenarios } = candidate.structuredData;
  let domainValid = inputs.length >= 2 && new Set(inputs).size === inputs.length && gates.length >= 2 && new Set(gates.map((gate) => gate.id)).size === gates.length && scenarios.length === candidate.questions.length;
  try {
    circuitDepth(inputs, gates);
    domainValid &&= outputs.length === 2 && new Set(outputs).size === 2 && scenarios.every((scenario) => Object.keys(scenario.assignment).length === inputs.length && inputs.every((input) => typeof scenario.assignment[input] === "boolean")) && candidate.questions.every((question) => question.difficulty === requestedDifficulty && new Set(question.options.map((option) => option.content)).size === 4 && question.options.every((option) => typeof option.content === "string" && SIGNATURES.includes(option.content)));
  } catch { domainValid = false; }
  checks.push(check("domain", domainValid));
  if (!domainValid) return { valid: false, issues: [{ stage: "domain", code: "invalid_circuit_domain", message: "Circuit references, scenarios, outputs, or answer signatures violate the family domain." }], checks };
  let solved: Pick<CombinationalCircuitSolution, "outputSignatures" | "correctOptionIds">;
  try { solved = solveCombinationalCircuit(candidate); }
  catch (error) {
    checks.push(check("solve", false));
    return { valid: false, issues: [{ stage: "solve", code: "circuit_solve_failed", message: error instanceof Error ? error.message : "Unable to evaluate the circuit." }], checks };
  }
  checks.push(check("solve", true, { solverVersion: COMBINATIONAL_CIRCUIT_SOLVER_VERSION }));
  const storedMatches = solved.correctOptionIds.every((id, index) => candidate.questions[index].correctOptionId === id);
  checks.push(check("uniqueness", storedMatches));
  if (!storedMatches) return { valid: false, issues: [{ stage: "uniqueness", code: "circuit_answer_mismatch", message: "A stored answer differs from the independently evaluated output." }], checks };
  const calculated = calculateCombinationalCircuitDifficulty(candidate);
  const difficultyMatches = calculated.difficulty === requestedDifficulty;
  checks.push(check("difficulty", difficultyMatches, calculated.metrics));
  if (!difficultyMatches) return { valid: false, issues: [{ stage: "difficulty", code: "difficulty_mismatch", message: `Requested ${requestedDifficulty}, calculated ${calculated.difficulty}.` }], checks };
  const explanations = solved.outputSignatures.map((signature, index) => `${scenarios[index].id} evaluates gate by gate to Y1Y2 = ${signature}.`);
  checks.push(check("explanation", true));
  return { valid: true, solution: { ...solved, calculatedDifficulty: calculated.difficulty, metrics: calculated.metrics, explanations }, checks };
}

export function fingerprintCombinationalCircuit(candidate: CombinationalCircuitUnitCandidate): string {
  return createFingerprint("computer-science-circuit", candidate.structuredData);
}

const MAX_ATTEMPTS = 5_000;
export function generateValidatedCombinationalCircuitUnit(configuration: CombinationalCircuitGenerationConfiguration, acceptedFingerprints: ReadonlySet<string> = new Set()): CombinationalCircuitGeneratedUnit {
  const maxAttempts = configuration.maxAttempts ?? 500;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > MAX_ATTEMPTS) throw new RangeError(`maxAttempts must be from 1 through ${MAX_ATTEMPTS}.`);
  let lastIssues: ValidationIssue[] = [];
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const candidate = generateCombinationalCircuitCandidate(configuration, attempt);
      const validation = validateCombinationalCircuit(candidate, configuration.difficulty);
      if (!validation.valid) { lastIssues = validation.issues; continue; }
      const fingerprint = fingerprintCombinationalCircuit(candidate);
      if (acceptedFingerprints.has(fingerprint)) { lastIssues = [{ stage: "duplicate", code: "duplicate_fingerprint", message: "Duplicate combinational-circuit structure." }]; continue; }
      const timestamp = new Date().toISOString();
      return { ...candidate, questions: candidate.questions.map((question, index) => ({ ...question, explanation: validation.solution.explanations[index] })), metadata: { seed: configuration.seed, generatorVersion: COMBINATIONAL_CIRCUIT_GENERATOR_VERSION, validatorVersion: COMBINATIONAL_CIRCUIT_VALIDATOR_VERSION, requestedDifficulty: configuration.difficulty, calculatedDifficulty: validation.solution.calculatedDifficulty, generatedAt: timestamp, attemptCount: attempt, fingerprint }, validation: { valid: true, validatedAt: timestamp, checks: [...validation.checks, check("duplicate", true, { fingerprint })] } };
    } catch (error) { lastIssues = [{ stage: "safety", code: "circuit_construction_failed", message: error instanceof Error ? error.message : "Construction failed." }]; }
  }
  throw new Error(`Unable to generate a validated combinational circuit in ${maxAttempts} attempts: ${lastIssues.at(-1)?.message ?? "unknown failure"}`);
}

export function reproduceValidatedCombinationalCircuitUnit(configuration: CombinationalCircuitGenerationConfiguration, attempt: number): CombinationalCircuitGeneratedUnit {
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > MAX_ATTEMPTS) throw new RangeError(`attempt must be from 1 through ${MAX_ATTEMPTS}.`);
  const candidate = generateCombinationalCircuitCandidate(configuration, attempt);
  const validation = validateCombinationalCircuit(candidate, configuration.difficulty);
  if (!validation.valid) throw new Error(validation.issues[0]?.message ?? "Reproduction failed validation.");
  const timestamp = new Date().toISOString();
  const fingerprint = fingerprintCombinationalCircuit(candidate);
  return { ...candidate, questions: candidate.questions.map((question, index) => ({ ...question, explanation: validation.solution.explanations[index] })), metadata: { seed: configuration.seed, generatorVersion: COMBINATIONAL_CIRCUIT_GENERATOR_VERSION, validatorVersion: COMBINATIONAL_CIRCUIT_VALIDATOR_VERSION, requestedDifficulty: configuration.difficulty, calculatedDifficulty: validation.solution.calculatedDifficulty, generatedAt: timestamp, attemptCount: attempt, fingerprint }, validation: { valid: true, validatedAt: timestamp, checks: [...validation.checks, check("duplicate", true, { fingerprint })] } };
}
