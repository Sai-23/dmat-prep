import { canonicalize } from "../../fingerprint";
import { SeededRandom } from "../../random";
import type { GenerationDifficulty, JsonValue } from "../../types";
import { adaptSubjectTestletForDelivery, type GeneratedSubjectTestlet, type LogicTestletConfiguration, type LogicTestletSize } from "./logic-testlets";
import { fingerprintSubjectTestlet, fingerprintSubjectTestletQuestion } from "./fingerprint";
import { SUBJECT_TESTLET_VALIDATOR_VERSION, type SubjectTestlet, type SubjectTestletQuestion, type TestletReasoningRole } from "./types";
import { validateSubjectTestlet } from "./validation";
import { getProgrammingFamily, validateProgrammingComposition } from "./programming-family-registry";
import { semanticFingerprintSubjectTestlet } from "./diversity";

export const PROGRAMMING_TRACE_GENERATOR_VERSION = "programming-hybrid-state@3.0.0";
export const PROGRAMMING_TRACE_SOLVER_VERSION = "programming-trace-simulator@3.0.0";

export type ProgrammingStructure = "forward_transform" | "reverse_transform" | "bounded_transform" | "alternating_transform" | "skip_transform" | "search_transform" | "nested_transform" | "overwrite_transform" | "pair_swap" | "dependent_transform";
export type ProgrammingTraceDefinition = { values: number[]; divisor: number; increment: number; structure?: ProgrammingStructure; stopAfter?: number };
export type ProgrammingTraceStep = { index: number; inputValue: number; branch: "divisible" | "other"; array: number[]; total: number; updates: number };
export type ProgrammingTraceSolution = { finalArray: number[]; finalTotal: number; updates: number; steps: ProgrammingTraceStep[] };

export function simulateProgrammingTrace(definition: ProgrammingTraceDefinition): ProgrammingTraceSolution {
  if (!Number.isInteger(definition.divisor) || definition.divisor < 2 || !Number.isInteger(definition.increment)) throw new Error("Invalid programming trace parameters.");
  const values = [...definition.values];
  let total = 0;
  let updates = 0;
  const steps: ProgrammingTraceStep[] = [];
  const structure = definition.structure ?? "forward_transform";
  const forward = values.map((_, index) => index);
  const indexes = structure === "reverse_transform" ? [...forward].reverse() : structure === "nested_transform" ? [...forward, ...forward] : forward;
  for (const index of indexes) {
    if (structure === "skip_transform" && index % 2 === 1) continue;
    const inputValue = values[index];
    const branch = inputValue % definition.divisor === 0 ? "divisible" : "other";
    if (branch === "divisible") {
      if (structure === "pair_swap" && index + 1 < values.length) [values[index], values[index + 1]] = [values[index + 1], values[index]];
      else if (structure === "overwrite_transform") values[index] = definition.increment;
      else values[index] += structure === "alternating_transform" && index % 2 === 1 ? -definition.increment : structure === "dependent_transform" ? definition.increment + updates : definition.increment;
      total += values[index];
      updates += 1;
    } else total -= values[index];
    steps.push({ index, inputValue, branch, array: [...values], total, updates });
    if (structure === "bounded_transform" && updates === definition.stopAfter) break;
    if (structure === "search_transform" && branch === "divisible") break;
  }
  return { finalArray: values, finalTotal: total, updates, steps };
}

function sizeFor(configuration: LogicTestletConfiguration): number {
  if (configuration.targetSize && configuration.targetSize !== "auto") return configuration.targetSize;
  return configuration.difficulty === "easy" ? 4 : configuration.difficulty === "medium" ? 6 : 8;
}

function numericOptions(correct: number, spread = 2): number[] {
  const values = new Set([correct, correct - 1, correct + 1, correct + spread, -correct]);
  for (let offset = 2; values.size < 4; offset += 1) values.add(correct - offset);
  return [...values].slice(0, 4);
}

function arrayText(values: number[]): string { return `[${values.join(", ")}]`; }

function arrayOptions(correct: number[], original: number[], definition: ProgrammingTraceDefinition): string[] {
  const missed = original.map((value, index) => value % definition.divisor === 0 && index !== 0 ? value + definition.increment : value);
  const allUpdated = original.map((value) => value + definition.increment);
  const wrongIncrement = original.map((value) => value % definition.divisor === 0 ? value + definition.increment + 1 : value);
  const values = new Set([arrayText(correct), arrayText(original), arrayText(missed), arrayText(allUpdated), arrayText(wrongIncrement)]);
  return [...values].slice(0, 4);
}

function summaryOptions(total: number, updates: number): string[] {
  const correct = `${total}, ${updates}`;
  const values = new Set([correct, `${updates}, ${total}`, `${total + 1}, ${updates}`, `${total}, ${updates + 1}`, `${total - 1}, ${updates}`, `${total}, ${Math.max(0, updates - 1)}`]);
  for (let offset = 2; values.size < 4; offset += 1) values.add(`${total + offset}, ${updates}`);
  return [...values].slice(0, 4);
}

function options(values: JsonValue[], correct: JsonValue, random: SeededRandom, index: number): SubjectTestletQuestion["options"] {
  const unique = [...new Map(values.map((value) => [canonicalize(value), value])).values()];
  if (unique.length !== 4 || !unique.some((value) => canonicalize(value) === canonicalize(correct))) throw new Error("Programming question requires four unique plausible options.");
  return random.shuffle(unique).map((content, optionIndex) => ({ id: `q${index}-option-${optionIndex + 1}`, label: String.fromCharCode(65 + optionIndex), content, ...(canonicalize(content) === canonicalize(correct) ? {} : { distractorReason: "common trace or off-by-one error" }) })) as SubjectTestletQuestion["options"];
}

function child(input: { index: number; text: string; family: string; role: TestletReasoningRole; difficulty: GenerationDifficulty; values: JsonValue[]; correct: JsonValue; explanation: string; semantic: JsonValue; random: SeededRandom; blockIds?: string[] }): SubjectTestletQuestion {
  const answerOptions = options(input.values, input.correct, input.random.fork(`question-${input.index}`), input.index);
  const correctOptionId = answerOptions.find((option) => canonicalize(option.content) === canonicalize(input.correct))!.id;
  return { id: `question-${input.index}`, questionText: input.text, family: input.family, reasoningRole: input.role, verificationClass: getProgrammingFamily(input.family)?.verificationClass ?? "A", stimulusBlockIds: input.blockIds ?? ["scenario", "pseudocode", "initial-state"], difficulty: input.difficulty, options: answerOptions, correctOptionId, explanation: input.explanation, semanticParameters: input.semantic, validation: { solverVersion: PROGRAMMING_TRACE_SOLVER_VERSION, verifiedCorrectOptionId: correctOptionId, explanationVerified: true, ambiguous: false } };
}

function definitionFor(configuration: LogicTestletConfiguration, attempt: number): ProgrammingTraceDefinition {
  if (!configuration.seed.trim()) throw new Error("A non-empty Programming testlet seed is required.");
  const random = new SeededRandom(`${PROGRAMMING_TRACE_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${attempt}`);
  const length = configuration.difficulty === "easy" ? 4 : configuration.difficulty === "medium" ? 5 : 6;
  const divisor = configuration.difficulty === "hard" ? 3 : 2;
  const increment = random.integer(1, configuration.difficulty === "easy" ? 3 : 5);
  const structures: ProgrammingStructure[] = configuration.difficulty === "easy"
    ? ["forward_transform", "reverse_transform", "skip_transform", "overwrite_transform"]
    : configuration.difficulty === "medium"
      ? ["forward_transform", "reverse_transform", "bounded_transform", "alternating_transform", "skip_transform", "search_transform", "overwrite_transform", "dependent_transform"]
      : ["forward_transform", "reverse_transform", "bounded_transform", "alternating_transform", "skip_transform", "search_transform", "nested_transform", "overwrite_transform", "pair_swap", "dependent_transform"];
  const structure = random.pick(structures);
  const values = Array.from({ length }, (_, index) => {
    const quotient = random.integer(1, 4);
    return index % 2 === 0 ? quotient * divisor : quotient * divisor + random.integer(1, divisor - 1);
  });
  return { values, divisor, increment, structure, ...(structure === "bounded_transform" ? { stopAfter: 2 } : {}) };
}

function pseudocodeFor(definition: ProgrammingTraceDefinition): string {
  const structure = definition.structure ?? "forward_transform";
  const loop = structure === "reverse_transform"
    ? "for i = length(values) - 1 down to 0:"
    : structure === "nested_transform"
      ? "for pass = 1 to 2:\n    for i = 0 to length(values) - 1:"
      : structure === "skip_transform"
        ? "for i = 0 to length(values) - 1 step 2:"
        : "for i = 0 to length(values) - 1:";
  const mutation = structure === "alternating_transform"
    ? `if i mod 2 = 0:\n        values[i] = values[i] + ${definition.increment}\n      else:\n        values[i] = values[i] - ${definition.increment}`
    : structure === "overwrite_transform" ? `values[i] = ${definition.increment}`
      : structure === "pair_swap" ? "if i + 1 < length(values):\n        swap values[i] and values[i + 1]"
        : structure === "dependent_transform" ? `values[i] = values[i] + ${definition.increment} + updates`
          : `values[i] = values[i] + ${definition.increment}`;
  const stop = structure === "bounded_transform" ? `\n      if updates = ${definition.stopAfter}:\n        break` : "";
  const searchStop = structure === "search_transform" ? "\n      break" : "";
  const indent = structure === "nested_transform" ? "  " : "";
  return `function transform(values):\n  total = 0\n  updates = 0\n  ${loop}\n${indent}    if values[i] mod ${definition.divisor} = 0:\n${indent}      ${mutation}\n${indent}      total = total + values[i]\n${indent}      updates = updates + 1${stop}${searchStop}\n${indent}    else:\n${indent}      total = total - values[i]\n  return total`;
}

function questionsFor(definition: ProgrammingTraceDefinition, difficulty: GenerationDifficulty, size: number, random: SeededRandom): SubjectTestletQuestion[] {
  const solved = simulateProgrammingTrace(definition);
  const prefixLength = Math.min(solved.steps.length, Math.max(2, Math.floor(definition.values.length / 2)));
  const prefixTotal = solved.steps[prefixLength - 1].total;
  const selectedIndex = random.integer(0, definition.values.length - 1);
  const shortened = simulateProgrammingTrace({ ...definition, values: definition.values.slice(0, -1) });
  const result = [
    child({ index: 1, text: "What value does the function return after the complete loop finishes?", family: "final_return_value", role: "output_prediction", difficulty, values: numericOptions(solved.finalTotal, definition.increment), correct: solved.finalTotal, explanation: `The verified loop trace finishes with total = ${solved.finalTotal}.`, semantic: { task: "final_total" }, random }),
    child({ index: 2, text: "Which array state remains after every iteration has executed?", family: "array_mutation_trace", role: "state_prediction", difficulty, values: arrayOptions(solved.finalArray, definition.values, definition), correct: arrayText(solved.finalArray), explanation: `The verified structure applies its conditional operation, producing ${arrayText(solved.finalArray)}.`, semantic: { task: "final_array" }, random }),
    child({ index: 3, text: "How many times is the variable updates increased during this call?", family: "branch_execution_count", role: "calculation", difficulty, values: numericOptions(solved.updates), correct: solved.updates, explanation: `The verified trace enters the update branch ${solved.updates} times.`, semantic: { task: "updates" }, random }),
    child({ index: 4, text: `What is the final value stored at zero-based array index ${selectedIndex}?`, family: "indexed_final_state", role: "direct_application", difficulty, values: numericOptions(solved.finalArray[selectedIndex], definition.increment), correct: solved.finalArray[selectedIndex], explanation: `Tracing the branch for index ${selectedIndex} leaves value ${solved.finalArray[selectedIndex]}.`, semantic: { task: "index_value", selectedIndex }, random }),
    child({ index: 5, text: `What is total immediately after the first ${prefixLength} iterations, before the remaining elements are processed?`, family: "intermediate_accumulator", role: "tracing", difficulty, values: numericOptions(prefixTotal, definition.increment), correct: prefixTotal, explanation: `The simulator records total = ${prefixTotal} after iteration ${prefixLength}.`, semantic: { task: "prefix_total", prefixLength }, random }),
    child({ index: 6, text: "If the final array position were accidentally omitted from the supplied input, what value would be returned?", family: "off_by_one_consequence", role: "error_detection", difficulty, values: numericOptions(shortened.finalTotal, definition.values.at(-1) ?? 1), correct: shortened.finalTotal, explanation: `The shortened-input variant returns ${shortened.finalTotal} because the final position is absent.`, semantic: { task: "omit_last" }, random }),
    child({ index: 7, text: "Which pair gives the final return value and update count, in that order?", family: "result_summary_pair", role: "alternative_representation", difficulty, values: summaryOptions(solved.finalTotal, solved.updates), correct: `${solved.finalTotal}, ${solved.updates}`, explanation: `The independently simulated summary is (${solved.finalTotal}, ${solved.updates}).`, semantic: { task: "summary_pair" }, random }),
    child({ index: 8, text: "In the worst case for an input array of length n, how many times is the divisibility condition evaluated?", family: "loop_condition_complexity", role: "complexity_reasoning", difficulty, values: ["n", "ceil(n / 2)", "2n", "n²"], correct: definition.structure === "nested_transform" ? "2n" : definition.structure === "skip_transform" ? "ceil(n / 2)" : "n", explanation: definition.structure === "nested_transform" ? "Two complete passes evaluate the condition 2n times." : definition.structure === "skip_transform" ? "Only every second index is visited, giving ceil(n / 2) evaluations." : "At most each of the n positions is evaluated once.", semantic: { task: "condition_count", structure: definition.structure ?? "forward_transform" }, random, blockIds: ["pseudocode", "complexity-model"] }),
  ];
  const archetypes = size === 4 ? [[0, 1, 5, 7], [0, 2, 3, 4], [1, 2, 4, 6], [0, 3, 5, 6]] : size === 6 ? [[0, 1, 2, 4, 5, 7], [0, 1, 3, 4, 6, 7], [0, 2, 3, 5, 6, 7]] : [[0, 1, 2, 3, 4, 5, 6, 7]];
  const selected = random.pick(archetypes).map((index) => result[index]).slice(0, size);
  const compositionIssues = validateProgrammingComposition(selected.map((question) => question.family));
  if (compositionIssues.length) throw new Error(`Invalid Programming family composition: ${compositionIssues.join(", ")}`);
  return selected;
}

export function generateProgrammingSubjectTestlet(configuration: LogicTestletConfiguration, attempt = 1): SubjectTestlet {
  if (!Number.isSafeInteger(attempt) || attempt < 1) throw new RangeError("Generation attempt must be positive.");
  const definition = definitionFor(configuration, attempt);
  const size = sizeFor(configuration);
  const random = new SeededRandom(`${PROGRAMMING_TRACE_GENERATOR_VERSION}\u001fquestions\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${size}\u001f${attempt}`);
  const questions = questionsFor(definition, configuration.difficulty, size, random);
  const structure = definition.structure ?? "forward_transform";
  const scenarios: Record<ProgrammingStructure, string> = {
    forward_transform: "A telemetry service processes readings from first to last and updates qualifying records in place.",
    reverse_transform: "A recovery routine processes stored records from the final array position back to the first.",
    bounded_transform: "A monitoring routine stops as soon as its verified update quota is reached.",
    alternating_transform: "A calibration routine applies opposite adjustments at even and odd array indexes.",
    skip_transform: "A sampling routine inspects every second reading, leaving skipped positions untouched.",
    search_transform: "A search-like routine stops after locating and updating the first qualifying reading.",
    nested_transform: "A two-pass normalization routine traverses the same stored batch twice.",
    overwrite_transform: "A sanitization routine replaces qualifying readings with a fixed safe value.",
    pair_swap: "A reordering routine swaps a qualifying reading with its following neighbor when one exists.",
    dependent_transform: "A progressive calibration uses the number of earlier updates when calculating the next adjustment.",
  };
  const blocks: SubjectTestlet["stimulus"]["blocks"] = [
    { id: "scenario", kind: "paragraph", text: `${scenarios[structure]} The array is passed by reference and indexes start at zero.` },
    { id: "pseudocode", kind: "pseudocode", language: "pseudocode", code: pseudocodeFor(definition) },
    { id: "initial-state", kind: "table", data: { headers: definition.values.map((_, index) => `index ${index}`), rows: [definition.values] } },
  ];
  if (questions.some((question) => question.family === "loop_condition_complexity")) blocks.push({ id: "complexity-model", kind: "formula", expression: structure === "nested_transform" ? "C(n) = 2n" : structure === "skip_transform" ? "C(n) = ⌈n / 2⌉" : "C(n) ≤ n" });
  if (["search_transform", "bounded_transform", "nested_transform"].includes(structure)) {
    const solved = simulateProgrammingTrace(definition);
    blocks.push({ id: "execution-shape", kind: "table", data: { headers: ["step", "index", "branch", "updates"], rows: solved.steps.map((step, index) => [index + 1, step.index, step.branch, step.updates]) } });
    questions.filter((question) => question.family === "intermediate_accumulator" || question.family === "branch_execution_count").forEach((question) => question.stimulusBlockIds.push("execution-shape"));
  }
  const testlet: SubjectTestlet = {
    schemaVersion: 1,
    id: `programming-${canonicalize([configuration.seed, attempt]).slice(-12)}`,
    module: "programming",
    topic: "program_trace",
    subtopic: "loops_arrays_functions",
    overallDifficulty: configuration.difficulty,
    stimulus: { id: "programming-stimulus", title: "Trace a function that transforms stored data", blocks },
    questions,
    metadata: { testletId: "pending", stimulusTypes: [...new Set(blocks.map((block) => block.kind))], questionCount: size, questionFamilies: [], overallDifficulty: configuration.difficulty, seed: configuration.seed, generatorVersion: PROGRAMMING_TRACE_GENERATOR_VERSION, validatorVersion: SUBJECT_TESTLET_VALIDATOR_VERSION, fingerprint: "pending", generationAttempts: attempt, childFingerprints: [], semanticParameters: definition, promptVersion: "deterministic-presentation@1", modelIdentifier: "none", reviewStatus: "validated" },
  };
  testlet.metadata.testletId = testlet.id;
  testlet.metadata.questionFamilies = testlet.questions.map((question) => question.family);
  testlet.metadata.childFingerprints = testlet.questions.map(fingerprintSubjectTestletQuestion);
  testlet.metadata.fingerprint = fingerprintSubjectTestlet(testlet);
  testlet.metadata.semanticFingerprint = semanticFingerprintSubjectTestlet(testlet);
  const validation = validateSubjectTestlet(testlet, { maximumQuestions: size });
  if (!validation.valid) throw new Error(`Invalid Programming testlet: ${validation.issues.map((issue) => issue.code).join(", ")}`);
  return testlet;
}

function pipeline(configuration: LogicTestletConfiguration, accepted: ReadonlySet<string>): GeneratedSubjectTestlet {
  const maximumAttempts = configuration.maxAttempts ?? 500;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const testlet = generateProgrammingSubjectTestlet(configuration, attempt);
    if (!accepted.has(testlet.metadata.fingerprint)) return adaptSubjectTestletForDelivery(testlet, configuration, "programming_testlet");
  }
  throw new Error(`Unable to generate a unique Programming testlet in ${maximumAttempts} attempts.`);
}

export function generateValidatedProgrammingSubjectTestlet(configuration: LogicTestletConfiguration, accepted: ReadonlySet<string> = new Set()): GeneratedSubjectTestlet { return pipeline(configuration, accepted); }
export function reproduceValidatedProgrammingSubjectTestlet(configuration: LogicTestletConfiguration, attempt: number): GeneratedSubjectTestlet { return adaptSubjectTestletForDelivery(generateProgrammingSubjectTestlet(configuration, attempt), configuration, "programming_testlet"); }
export type ProgrammingTestletSize = LogicTestletSize;
