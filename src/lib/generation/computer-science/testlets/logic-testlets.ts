import { canonicalize } from "../../fingerprint";
import { SeededRandom } from "../../random";
import type { GenerationDifficulty, GenerationMetadata, JsonValue, PresentationBlock, ValidationCheck, ValidationMetadata } from "../../types";
import { booleanExpressionText, evaluateBooleanExpression, generateBooleanLogicCandidate } from "../boolean-logic";
import { evaluateCombinationalCircuit, generateCombinationalCircuitCandidate } from "../combinational-circuits";
import type { BooleanAssignment, BooleanLogicUnitCandidate, CombinationalCircuitUnitCandidate, ComputerScienceSubjectUnit } from "../types";
import { fingerprintSubjectTestlet, fingerprintSubjectTestletQuestion } from "./fingerprint";
import { SUBJECT_TESTLET_VALIDATOR_VERSION, type SubjectTestlet, type SubjectTestletQuestion, type TestletReasoningRole } from "./types";
import { validateSubjectTestlet } from "./validation";

export const BOOLEAN_TESTLET_GENERATOR_VERSION = "boolean-testlet@1.0.0";
export const BOOLEAN_TESTLET_SOLVER_VERSION = "boolean-testlet-solver@1.0.0";
export const CIRCUIT_TESTLET_GENERATOR_VERSION = "circuit-testlet@1.0.0";
export const CIRCUIT_TESTLET_SOLVER_VERSION = "circuit-testlet-solver@1.0.0";

export type LogicTestletSize = "auto" | 4 | 5 | 6 | 7 | 8;
export type LogicTestletConfiguration = { seed: string; difficulty: GenerationDifficulty; targetSize?: LogicTestletSize; maxAttempts?: number };
export type GeneratedSubjectTestlet = ComputerScienceSubjectUnit & {
  family: "boolean_testlet" | "circuit_testlet" | "programming_testlet" | "recursion_testlet" | "oop_testlet";
  structuredData: SubjectTestlet;
  testlet: SubjectTestlet;
  metadata: GenerationMetadata;
  validation: ValidationMetadata;
};
export type GeneratedLogicSubjectTestlet = GeneratedSubjectTestlet;

function targetSize(configuration: LogicTestletConfiguration): number {
  if (configuration.targetSize && configuration.targetSize !== "auto") return configuration.targetSize;
  return configuration.difficulty === "easy" ? 4 : configuration.difficulty === "medium" ? 6 : 8;
}

function tupleOptions(values: JsonValue[], correct: JsonValue, random: SeededRandom, questionIndex: number, reasons: string[]): SubjectTestletQuestion["options"] {
  const unique = [...new Map(values.map((value, index) => [canonicalize(value), { value, reason: reasons[index] ?? "plausible alternative" }])).values()];
  if (unique.length !== 4 || !unique.some((item) => canonicalize(item.value) === canonicalize(correct))) throw new Error("Testlet options must contain four unique values including the verified answer.");
  return random.shuffle(unique).map((item, index) => ({ id: `q${questionIndex}-option-${index + 1}`, label: String.fromCharCode(65 + index), content: item.value, ...(canonicalize(item.value) === canonicalize(correct) ? {} : { distractorReason: item.reason }) })) as SubjectTestletQuestion["options"];
}

function numericOptions(correct: number, maximum: number): number[] {
  const values = new Set([correct, Math.max(0, correct - 1), Math.min(maximum, correct + 1), maximum - correct]);
  for (let value = 0; values.size < 4; value += 1) values.add(value);
  return [...values].slice(0, 4);
}

function bitOptions(correct: string): string[] {
  const values = new Set([correct]);
  for (let index = 0; values.size < 4 && index < correct.length; index += 1) values.add(correct.slice(0, index) + (correct[index] === "T" ? "F" : "T") + correct.slice(index + 1));
  values.add(correct.replace(/[TF]/g, (value) => value === "T" ? "F" : "T"));
  values.add([...correct].reverse().join(""));
  return [...values].slice(0, 4);
}

function countPairOptions(first: number, second: number, maximum: number): string[] {
  const correct = `${first},${second}`;
  const values = new Set([correct, `${second},${first}`, `${Math.max(0, first - 1)},${second}`, `${first},${Math.min(maximum, second + 1)}`, "0,0", `${maximum},${maximum}`]);
  for (let left = 0; values.size < 4; left += 1) values.add(`${left},${(left + 1) % (maximum + 1)}`);
  return [...values].slice(0, 4);
}

function rowOptionLabels(rows: BooleanAssignment[], variables: string[], correctIndex: number, random: SeededRandom): string[] {
  const selected = random.shuffle(rows.map((assignment, index) => ({ index, label: rowLabel(assignment, variables) }))).slice(0, 4);
  if (!selected.some((item) => item.index === correctIndex)) selected[0] = { index: correctIndex, label: rowLabel(rows[correctIndex], variables) };
  return selected.map((item) => item.label);
}

function rowLabel(row: BooleanAssignment, variables: string[]): string { return variables.map((variable) => `${variable}=${row[variable] ? "T" : "F"}`).join(", "); }

function question(input: {
  index: number; text: string; family: string; role: TestletReasoningRole; blockIds: string[]; difficulty: GenerationDifficulty;
  values: JsonValue[]; correct: JsonValue; semantic: JsonValue; explanation: string; solverVersion: string; random: SeededRandom; reasons?: string[];
}): SubjectTestletQuestion {
  const options = tupleOptions(input.values, input.correct, input.random.fork(`question-${input.index}`), input.index, input.reasons ?? []);
  const correctOptionId = options.find((option) => canonicalize(option.content) === canonicalize(input.correct))!.id;
  return { id: `question-${input.index}`, questionText: input.text, family: input.family, reasoningRole: input.role, stimulusBlockIds: input.blockIds, difficulty: input.difficulty, options, correctOptionId, explanation: input.explanation, semanticParameters: input.semantic, validation: { solverVersion: input.solverVersion, verifiedCorrectOptionId: correctOptionId, explanationVerified: true, ambiguous: false } };
}

function finalize(input: {
  id: string; module: SubjectTestlet["module"]; topic: string; subtopic: string; difficulty: GenerationDifficulty;
  title: string; blocks: SubjectTestlet["stimulus"]["blocks"]; questions: SubjectTestletQuestion[];
  seed: string; generatorVersion: string; attempt: number; semanticParameters: JsonValue;
}): SubjectTestlet {
  const value: SubjectTestlet = {
    schemaVersion: 1, id: input.id, module: input.module, topic: input.topic, subtopic: input.subtopic, overallDifficulty: input.difficulty,
    stimulus: { id: `${input.id}-stimulus`, title: input.title, blocks: input.blocks }, questions: input.questions,
    metadata: { testletId: input.id, stimulusTypes: [...new Set(input.blocks.map((block) => block.kind))], questionCount: input.questions.length, questionFamilies: [...new Set(input.questions.map((item) => item.family))], overallDifficulty: input.difficulty, seed: input.seed, generatorVersion: input.generatorVersion, validatorVersion: SUBJECT_TESTLET_VALIDATOR_VERSION, fingerprint: "pending", generationAttempts: input.attempt, childFingerprints: [], semanticParameters: input.semanticParameters },
  };
  value.metadata.childFingerprints = value.questions.map(fingerprintSubjectTestletQuestion);
  value.metadata.fingerprint = fingerprintSubjectTestlet(value);
  const validated = validateSubjectTestlet(value, { maximumQuestions: targetSize({ seed: input.seed, difficulty: input.difficulty, targetSize: input.questions.length as LogicTestletSize }) });
  if (!validated.valid) throw new Error(`Invalid logic testlet: ${validated.issues.map((item) => item.code).join(", ")}`);
  return value;
}

function booleanQuestions(candidate: BooleanLogicUnitCandidate, size: number, random: SeededRandom, difficulty: GenerationDifficulty): SubjectTestletQuestion[] {
  const { variables, rowOrder, expressions } = candidate.structuredData;
  const signatures = expressions.map((item) => rowOrder.map((row) => evaluateBooleanExpression(item.expression, row) ? "T" : "F").join(""));
  const first = signatures[0]; const second = signatures[1]; const row = random.integer(0, rowOrder.length - 1);
  const equality = rowOrder.map((_, index) => first[index] === second[index]);
  const condition = equality.some(Boolean) ? true : false;
  const firstCondition = equality.findIndex((value) => value === condition);
  const questions: SubjectTestletQuestion[] = [
    question({ index: 1, text: "Which complete output column is produced by expression E1 in the supplied row order?", family: "truth_column", role: "output_prediction", blockIds: ["row-order", "expressions"], difficulty, values: bitOptions(first), correct: first, semantic: { expression: 0, task: "signature" }, explanation: `Independent evaluation gives E1 = ${first}.`, solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 2, text: "How many rows make expression E2 true?", family: "true_row_count", role: "calculation", blockIds: ["row-order", "expressions"], difficulty, values: numericOptions([...second].filter((value) => value === "T").length, rowOrder.length), correct: [...second].filter((value) => value === "T").length, semantic: { expression: 1, task: "true_count" }, explanation: `E2 is true in ${[...second].filter((value) => value === "T").length} rows.`, solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 3, text: `For the highlighted input row ${rowLabel(rowOrder[row], variables)}, what is the pair E1E2?`, family: "paired_row_output", role: "direct_application", blockIds: ["row-order", "expressions"], difficulty, values: ["FF", "FT", "TF", "TT"], correct: `${first[row]}${second[row]}`, semantic: { row, task: "paired_output" }, explanation: `At that row, E1E2 = ${first[row]}${second[row]}.`, solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 4, text: `Which listed row is the first one where E1 and E2 ${condition ? "agree" : "differ"}?`, family: "first_relationship_row", role: "comparison", blockIds: ["row-order", "expressions"], difficulty, values: rowOptionLabels(rowOrder, variables, firstCondition, random), correct: rowLabel(rowOrder[firstCondition], variables), semantic: { condition, task: "first_relationship" }, explanation: `Row-by-row comparison first satisfies the condition at ${rowLabel(rowOrder[firstCondition], variables)}.`, solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 5, text: "How many supplied rows make expression E1 false?", family: "false_row_count", role: "interpretation", blockIds: ["row-order", "expressions"], difficulty, values: numericOptions([...first].filter((value) => value === "F").length, rowOrder.length), correct: [...first].filter((value) => value === "F").length, semantic: { expression: 0, task: "false_count" }, explanation: `E1 is false in ${[...first].filter((value) => value === "F").length} rows.`, solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 6, text: "How many rows produce different outputs for E1 and E2?", family: "difference_count", role: "consequence", blockIds: ["row-order", "expressions"], difficulty, values: numericOptions(equality.filter((value) => !value).length, rowOrder.length), correct: equality.filter((value) => !value).length, semantic: { task: "difference_count" }, explanation: `The two columns differ in ${equality.filter((value) => !value).length} rows.`, solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 7, text: "Which pair summarizes the numbers of true rows for E1 and E2, in that order?", family: "true_count_pair", role: "alternative_representation", blockIds: ["row-order", "expressions"], difficulty, values: countPairOptions([...first].filter((v) => v === "T").length, [...second].filter((v) => v === "T").length, rowOrder.length), correct: [...first].filter((v) => v === "T").length + "," + [...second].filter((v) => v === "T").length, semantic: { task: "true_count_pair" }, explanation: "The pair is obtained by counting each independently evaluated column.", solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
    question({ index: 8, text: "If the two expression outputs feed an XOR gate, how many supplied rows make that gate true?", family: "derived_xor_count", role: "synthesis", blockIds: ["row-order", "expressions"], difficulty, values: numericOptions(equality.filter((value) => !value).length, rowOrder.length), correct: equality.filter((value) => !value).length, semantic: { task: "derived_xor" }, explanation: "XOR is true exactly where the independently evaluated columns differ.", solverVersion: BOOLEAN_TESTLET_SOLVER_VERSION, random }),
  ];
  return questions.slice(0, size);
}

export function generateBooleanSubjectTestlet(configuration: LogicTestletConfiguration, attempt = 1): SubjectTestlet {
  const size = targetSize(configuration);
  const candidate = generateBooleanLogicCandidate({ seed: configuration.seed, difficulty: configuration.difficulty }, attempt);
  const random = new SeededRandom(`${BOOLEAN_TESTLET_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${size}\u001f${attempt}`);
  return finalize({ id: `boolean-${canonicalize([configuration.seed, attempt]).slice(-12)}`, module: "boolean_logic", topic: "boolean_expressions", subtopic: "truth_tables", difficulty: configuration.difficulty, title: "Analyze two Boolean expressions", blocks: [
    { id: "instructions", kind: "paragraph", text: "Evaluate the expressions using the supplied row order. T and F denote true and false." },
    { id: "row-order", kind: "table", data: { headers: candidate.structuredData.variables, rows: candidate.structuredData.rowOrder.map((row) => candidate.structuredData.variables.map((variable) => row[variable] ? "T" : "F")) } },
    { id: "expressions", kind: "formula", expression: candidate.structuredData.expressions.map((item) => `${item.id} = ${booleanExpressionText(item.expression)}`).join("    ") },
  ], questions: booleanQuestions(candidate, size, random, configuration.difficulty), seed: configuration.seed, generatorVersion: BOOLEAN_TESTLET_GENERATOR_VERSION, attempt, semanticParameters: candidate.structuredData });
}

function allAssignments(inputs: string[]): BooleanAssignment[] { return Array.from({ length: 2 ** inputs.length }, (_, row) => Object.fromEntries(inputs.map((input, index) => [input, Boolean(row & (1 << (inputs.length - index - 1)))]))); }

function circuitQuestions(candidate: CombinationalCircuitUnitCandidate, size: number, random: SeededRandom, difficulty: GenerationDifficulty, corruptRow: number): SubjectTestletQuestion[] {
  const { inputs, gates } = candidate.structuredData;
  const rows = allAssignments(inputs);
  const evaluated = rows.map((assignment) => evaluateCombinationalCircuit(candidate, assignment));
  const scenario = random.integer(0, rows.length - 1);
  const signatures = evaluated.map((result) => result.signature);
  const equality = signatures.map((signature) => signature[0] === signature[1]);
  const firstEqual = equality.findIndex(Boolean);
  const relation = firstEqual >= 0 ? true : false;
  const relationIndex = relation ? firstEqual : equality.findIndex((value) => !value);
  const gatePair = [gates[0].id, gates[1].id];
  const gateSignature = gatePair.map((gate) => evaluated[scenario].values[gate] ? "T" : "F").join("");
  const y1Count = signatures.filter((signature) => signature[0] === "T").length;
  const y2Count = signatures.filter((signature) => signature[1] === "T").length;
  const flipAssignment = { ...rows[scenario], [inputs[0]]: !rows[scenario][inputs[0]] };
  const flipped = evaluateCombinationalCircuit(candidate, flipAssignment).signature;
  const changed = flipped === signatures[scenario] ? "Neither output" : flipped[0] !== signatures[scenario][0] && flipped[1] !== signatures[scenario][1] ? "Both outputs" : flipped[0] !== signatures[scenario][0] ? "Y1 only" : "Y2 only";
  return [
    question({ index: 1, text: `For input ${rowLabel(rows[scenario], inputs)}, what is output pair Y1Y2?`, family: "circuit_output", role: "output_prediction", blockIds: ["circuit", "input-order"], difficulty, values: ["FF", "FT", "TF", "TT"], correct: signatures[scenario], semantic: { scenario, task: "outputs" }, explanation: `Gate-order evaluation gives Y1Y2 = ${signatures[scenario]}.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 2, text: `For the same input, what is the pair ${gatePair.join("")} after those gates are evaluated?`, family: "intermediate_gate_state", role: "tracing", blockIds: ["circuit", "input-order"], difficulty, values: ["FF", "FT", "TF", "TT"], correct: gateSignature, semantic: { scenario, gates: gatePair }, explanation: `Independent gate tracing gives ${gatePair.join("")} = ${gateSignature}.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 3, text: "Across every possible supplied input combination, how many make Y1 true?", family: "output_true_count", role: "calculation", blockIds: ["circuit", "input-order"], difficulty, values: numericOptions(y1Count, rows.length), correct: y1Count, semantic: { output: "Y1", task: "true_count" }, explanation: `Y1 is true in ${y1Count} evaluated rows.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 4, text: `Which listed input is the first in binary row order where Y1 and Y2 ${relation ? "agree" : "differ"}?`, family: "output_relationship", role: "comparison", blockIds: ["circuit", "input-order"], difficulty, values: rowOptionLabels(rows, inputs, relationIndex, random), correct: rowLabel(rows[relationIndex], inputs), semantic: { relation, task: "first_row" }, explanation: `The first matching row is ${rowLabel(rows[relationIndex], inputs)}.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 5, text: "Count the rows in the supplied input order where the second output Y2 has state T.", family: "second_output_true_count", role: "interpretation", blockIds: ["circuit", "input-order"], difficulty, values: numericOptions(y2Count, rows.length), correct: y2Count, semantic: { output: "Y2", task: "true_count" }, explanation: `Y2 is true in ${y2Count} evaluated rows.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 6, text: `If only input ${inputs[0]} is flipped in the highlighted scenario, which outputs change?`, family: "input_flip_consequence", role: "consequence", blockIds: ["circuit", "input-order"], difficulty, values: ["Neither output", "Y1 only", "Y2 only", "Both outputs"], correct: changed, semantic: { scenario, flippedInput: inputs[0] }, explanation: `Re-evaluation changes ${changed.toLowerCase()}.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 7, text: "Which ordered pair gives the true-row counts for Y1 and Y2?", family: "output_count_pair", role: "alternative_representation", blockIds: ["circuit", "input-order"], difficulty, values: countPairOptions(y1Count, y2Count, rows.length), correct: `${y1Count},${y2Count}`, semantic: { task: "count_pair" }, explanation: `Independent enumeration gives (${y1Count}, ${y2Count}).`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
    question({ index: 8, text: "One of the four proposed input/output records contains a deliberately flipped output pair. Which input identifies that erroneous record?", family: "trace_error_detection", role: "error_detection", blockIds: ["circuit", "proposed-records"], difficulty, values: rows.slice(0, 4).map((assignment) => rowLabel(assignment, inputs)), correct: rowLabel(rows[corruptRow], inputs), semantic: { corruptRow, task: "detect_error" }, explanation: `Recomputing the four records identifies ${rowLabel(rows[corruptRow], inputs)} as the altered one.`, solverVersion: CIRCUIT_TESTLET_SOLVER_VERSION, random }),
  ].slice(0, size);
}

export function generateCircuitSubjectTestlet(configuration: LogicTestletConfiguration, attempt = 1): SubjectTestlet {
  const size = targetSize(configuration);
  const candidate = generateCombinationalCircuitCandidate({ seed: configuration.seed, difficulty: configuration.difficulty }, attempt);
  const random = new SeededRandom(`${CIRCUIT_TESTLET_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${size}\u001f${attempt}`);
  const rows = allAssignments(candidate.structuredData.inputs);
  const corruptRow = random.integer(0, Math.min(3, rows.length - 1));
  const proposed = rows.slice(0, 4).map((assignment, index) => {
    const signature = evaluateCombinationalCircuit(candidate, assignment).signature;
    return [...candidate.structuredData.inputs.map((input) => assignment[input] ? "T" : "F"), index === corruptRow ? signature.replace(/[TF]/g, (value) => value === "T" ? "F" : "T") : signature];
  });
  return finalize({ id: `circuit-${canonicalize([configuration.seed, attempt]).slice(-12)}`, module: "boolean_logic", topic: "combinational_circuits", subtopic: "circuit_tracing", difficulty: configuration.difficulty, title: "Trace a combinational circuit", blocks: [
    { id: "instructions", kind: "paragraph", text: "Evaluate gates from G1 downward. Inputs use T/F and outputs are ordered Y1Y2." },
    { id: "circuit", kind: "circuit", data: { inputs: candidate.structuredData.inputs, gates: candidate.structuredData.gates, outputs: { Y1: candidate.structuredData.outputs[0], Y2: candidate.structuredData.outputs[1] } } },
    { id: "input-order", kind: "table", data: { headers: candidate.structuredData.inputs, rows: rows.map((assignment) => candidate.structuredData.inputs.map((input) => assignment[input] ? "T" : "F")) } },
    { id: "proposed-records", kind: "table", data: { headers: [...candidate.structuredData.inputs, "Y1Y2"], rows: proposed } },
  ], questions: circuitQuestions(candidate, size, random, configuration.difficulty, corruptRow), seed: configuration.seed, generatorVersion: CIRCUIT_TESTLET_GENERATOR_VERSION, attempt, semanticParameters: candidate.structuredData });
}

function deliveryBlock(block: SubjectTestlet["stimulus"]["blocks"][number]): PresentationBlock {
  if (block.kind === "paragraph") return { kind: "text", text: block.text };
  if ("code" in block) return { kind: "code", code: block.code, ...(block.language ? { language: block.language } : {}) };
  if (block.kind === "formula") return { kind: "formula", expression: block.expression };
  if (block.kind === "circuit" || block.kind === "diagram" || block.kind === "graph" || block.kind === "er_diagram" || block.kind === "uml_diagram") return { kind: "diagram", data: block.data };
  return { kind: "table", data: block.data };
}

export function adaptSubjectTestletForDelivery(testlet: SubjectTestlet, configuration: Pick<LogicTestletConfiguration, "seed" | "difficulty">, family: GeneratedSubjectTestlet["family"]): GeneratedSubjectTestlet {
  const timestamp = new Date().toISOString();
  const validationCheck = (stage: ValidationCheck["stage"], details?: ValidationCheck["details"]): ValidationCheck => ({ stage, passed: true, validatorVersion: SUBJECT_TESTLET_VALIDATOR_VERSION, ...(details ? { details } : {}) });
  return {
    schemaVersion: 1,
    module: "computer_science",
    subject: "computer_science",
    topic: testlet.topic,
    family,
    stimulus: { id: testlet.stimulus.id, title: testlet.stimulus.title, blocks: testlet.stimulus.blocks.map(deliveryBlock) },
    questions: testlet.questions.map((item) => ({ id: item.id, topic: testlet.topic, subtopic: item.family, difficulty: item.difficulty, prompt: item.questionText, blocks: [], options: item.options, correctOptionId: item.correctOptionId, explanation: item.explanation, estimatedSolveTimeSeconds: item.difficulty === "easy" ? 60 : item.difficulty === "medium" ? 90 : 120 })),
    structuredData: testlet,
    testlet,
    metadata: { seed: configuration.seed, generatorVersion: testlet.metadata.generatorVersion, validatorVersion: SUBJECT_TESTLET_VALIDATOR_VERSION, requestedDifficulty: configuration.difficulty, calculatedDifficulty: testlet.overallDifficulty, generatedAt: timestamp, attemptCount: testlet.metadata.generationAttempts, fingerprint: testlet.metadata.fingerprint },
    validation: { valid: true, validatedAt: timestamp, checks: [validationCheck("format", { questionCount: testlet.questions.length }), validationCheck("domain", { module: testlet.module, topic: testlet.topic }), validationCheck("solve", { childSolverVersions: testlet.questions.map((item) => item.validation.solverVersion) }), validationCheck("uniqueness", { childFingerprints: testlet.metadata.childFingerprints }), validationCheck("explanation"), validationCheck("difficulty", { overallDifficulty: testlet.overallDifficulty }), validationCheck("duplicate", { fingerprint: testlet.metadata.fingerprint })] },
  };
}

function validatedPipeline(configuration: LogicTestletConfiguration, acceptedFingerprints: ReadonlySet<string>, kind: "boolean" | "circuit"): GeneratedLogicSubjectTestlet {
  const maximumAttempts = configuration.maxAttempts ?? 500;
  if (!Number.isSafeInteger(maximumAttempts) || maximumAttempts < 1 || maximumAttempts > 5_000) throw new RangeError("maxAttempts must be from 1 through 5000.");
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const testlet = kind === "boolean" ? generateBooleanSubjectTestlet(configuration, attempt) : generateCircuitSubjectTestlet(configuration, attempt);
    if (acceptedFingerprints.has(testlet.metadata.fingerprint)) continue;
    return adaptSubjectTestletForDelivery(testlet, configuration, kind === "boolean" ? "boolean_testlet" : "circuit_testlet");
  }
  throw new Error(`Unable to generate a unique ${kind} testlet in ${maximumAttempts} attempts.`);
}

export function generateValidatedBooleanSubjectTestlet(configuration: LogicTestletConfiguration, acceptedFingerprints: ReadonlySet<string> = new Set()): GeneratedLogicSubjectTestlet { return validatedPipeline(configuration, acceptedFingerprints, "boolean"); }
export function generateValidatedCircuitSubjectTestlet(configuration: LogicTestletConfiguration, acceptedFingerprints: ReadonlySet<string> = new Set()): GeneratedLogicSubjectTestlet { return validatedPipeline(configuration, acceptedFingerprints, "circuit"); }
export function reproduceValidatedBooleanSubjectTestlet(configuration: LogicTestletConfiguration, attempt: number): GeneratedLogicSubjectTestlet { return adaptSubjectTestletForDelivery(generateBooleanSubjectTestlet(configuration, attempt), configuration, "boolean_testlet"); }
export function reproduceValidatedCircuitSubjectTestlet(configuration: LogicTestletConfiguration, attempt: number): GeneratedLogicSubjectTestlet { return adaptSubjectTestletForDelivery(generateCircuitSubjectTestlet(configuration, attempt), configuration, "circuit_testlet"); }
