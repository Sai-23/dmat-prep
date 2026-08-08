import { canonicalize } from "../../fingerprint";
import { SeededRandom } from "../../random";
import type { GenerationDifficulty, JsonValue } from "../../types";
import { semanticFingerprintSubjectTestlet } from "./diversity";
import { fingerprintSubjectTestlet, fingerprintSubjectTestletQuestion } from "./fingerprint";
import { adaptSubjectTestletForDelivery, type GeneratedSubjectTestlet, type LogicTestletConfiguration } from "./logic-testlets";
import { SUBJECT_TESTLET_VALIDATOR_VERSION, type SubjectTestlet, type SubjectTestletQuestion, type TestletReasoningRole } from "./types";
import { validateSubjectTestlet } from "./validation";

export const RECURSION_GENERATOR_VERSION = "programming-recursion@1.0.0";
export const RECURSION_SOLVER_VERSION = "recursion-evaluator@1.0.0";
export const OOP_GENERATOR_VERSION = "programming-oop@1.0.0";
export const OOP_SOLVER_VERSION = "oop-state-interpreter@1.0.0";

export type RecursionKind = "countdown_sum" | "reduce_by_two" | "conditional_reduce" | "array_sum" | "branching_count" | "recursive_search";
export type RecursionState = { kind: RecursionKind; start: number; values?: number[]; target?: number };
export type RecursionSolution = { returnValue: number; callCount: number; maxDepth: number; callOrder: number[] };

export function solveRecursion(state: RecursionState): RecursionSolution {
  if (!Number.isInteger(state.start) || state.start < 0 || state.start > 8) throw new Error("Unsafe recursion depth.");
  const calls: number[] = [];
  const visit = (n: number, depth: number): { value: number; depth: number } => {
    calls.push(n);
    if (state.kind === "branching_count") {
      if (n <= 1) return { value: 1, depth };
      const left = visit(n - 1, depth + 1);
      const right = visit(n - 2, depth + 1);
      return { value: left.value + right.value, depth: Math.max(left.depth, right.depth) };
    }
    if (state.kind === "recursive_search") {
      const values = state.values ?? [];
      if (n >= values.length) return { value: -1, depth };
      if (values[n] === state.target) return { value: n, depth };
      const next = visit(n + 1, depth + 1);
      return { value: next.value, depth: Math.max(depth, next.depth) };
    }
    if (state.kind === "array_sum") {
      const values = state.values ?? [];
      if (n >= values.length) return { value: 0, depth };
      const next = visit(n + 1, depth + 1);
      return { value: values[n] + next.value, depth: Math.max(depth, next.depth) };
    }
    if (n <= 0) return { value: state.kind === "conditional_reduce" ? 1 : 0, depth };
    const decrement = state.kind === "reduce_by_two" ? 2 : state.kind === "conditional_reduce" && n % 2 === 0 ? 2 : 1;
    const next = visit(Math.max(0, n - decrement), depth + 1);
    return { value: (state.kind === "conditional_reduce" ? 1 : n) + next.value, depth: Math.max(depth, next.depth) };
  };
  const solved = visit(state.kind === "array_sum" ? 0 : state.start, 1);
  return { returnValue: solved.value, callCount: calls.length, maxDepth: solved.depth, callOrder: calls };
}

export type OopState = { kind: "counter" | "inherited_counter" | "paired_account" | "encapsulated_counter" | "collaborating_accounts" | "constructor_chain"; initial: number; delta: number; calls: number };
export type OopSolution = { finalValue: number; methodResults: number[]; objectValues: number[] };

export function solveOopState(state: OopState): OopSolution {
  if (![state.initial, state.delta, state.calls].every(Number.isInteger) || state.calls < 1 || state.calls > 5) throw new Error("Invalid OOP state.");
  let value = state.kind === "constructor_chain" ? state.initial + 1 : state.initial;
  const methodResults: number[] = [];
  for (let index = 0; index < state.calls; index += 1) {
    const applied = state.kind === "inherited_counter" ? state.delta + 1 : state.kind === "collaborating_accounts" ? -state.delta : state.delta;
    value += applied;
    methodResults.push(value);
  }
  return { finalValue: value, methodResults, objectValues: state.kind === "paired_account" ? [value, state.initial] : state.kind === "collaborating_accounts" ? [value, state.initial + state.calls * state.delta] : [value] };
}

function optionTuple(correct: JsonValue, alternatives: JsonValue[], random: SeededRandom, index: number): SubjectTestletQuestion["options"] {
  const unique = new Map([correct, ...alternatives].map((value) => [canonicalize(value), value]));
  for (let offset = 2; unique.size < 4; offset += 1) {
    const fallback = typeof correct === "number" ? correct + offset : `${String(correct)} (variant ${offset})`;
    unique.set(canonicalize(fallback), fallback);
  }
  const values = [...unique.values()].slice(0, 4);
  return random.shuffle(values).map((content, optionIndex) => ({ id: `q${index}-option-${optionIndex + 1}`, label: String.fromCharCode(65 + optionIndex), content })) as SubjectTestletQuestion["options"];
}

function makeQuestion(input: { index: number; prompt: string; family: string; role: TestletReasoningRole; correct: JsonValue; alternatives: JsonValue[]; explanation: string; difficulty: GenerationDifficulty; solver: string; random: SeededRandom }): SubjectTestletQuestion {
  const options = optionTuple(input.correct, input.alternatives, input.random.fork(`q-${input.index}`), input.index);
  const correctOptionId = options.find((option) => canonicalize(option.content) === canonicalize(input.correct))!.id;
  return { id: `question-${input.index}`, questionText: input.prompt, family: input.family, reasoningRole: input.role, verificationClass: "A", stimulusBlockIds: ["scenario", "pseudocode"], difficulty: input.difficulty, options, correctOptionId, explanation: input.explanation, semanticParameters: { family: input.family, expected: input.correct }, validation: { solverVersion: input.solver, verifiedCorrectOptionId: correctOptionId, explanationVerified: true, ambiguous: false } };
}

function finalize(input: { id: string; topic: string; subtopic: string; difficulty: GenerationDifficulty; seed: string; attempt: number; version: string; title: string; blocks: SubjectTestlet["stimulus"]["blocks"]; questions: SubjectTestletQuestion[]; state: JsonValue }): SubjectTestlet {
  const value: SubjectTestlet = { schemaVersion: 1, id: input.id, module: "programming", topic: input.topic, subtopic: input.subtopic, overallDifficulty: input.difficulty, stimulus: { id: `${input.id}-stimulus`, title: input.title, blocks: input.blocks }, questions: input.questions, metadata: { testletId: input.id, stimulusTypes: [...new Set(input.blocks.map((block) => block.kind))], questionCount: input.questions.length, questionFamilies: [...new Set(input.questions.map((question) => question.family))], overallDifficulty: input.difficulty, seed: input.seed, generatorVersion: input.version, validatorVersion: SUBJECT_TESTLET_VALIDATOR_VERSION, fingerprint: "pending", generationAttempts: input.attempt, childFingerprints: [], semanticParameters: input.state, promptVersion: "deterministic-presentation@1", modelIdentifier: "none", reviewStatus: "validated" } };
  value.metadata.childFingerprints = value.questions.map(fingerprintSubjectTestletQuestion);
  value.metadata.fingerprint = fingerprintSubjectTestlet(value);
  value.metadata.semanticFingerprint = semanticFingerprintSubjectTestlet(value);
  const validation = validateSubjectTestlet(value);
  if (!validation.valid) throw new Error(`Invalid specialized Programming testlet: ${validation.issues.map((issue) => issue.code).join(", ")}`);
  return value;
}

export function generateRecursionSubjectTestlet(configuration: LogicTestletConfiguration, attempt = 1): SubjectTestlet {
  const random = new SeededRandom(`${RECURSION_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${attempt}`);
  const kind = random.pick<RecursionKind>(["countdown_sum", "reduce_by_two", "conditional_reduce", "array_sum", "branching_count", "recursive_search"]);
  const state: RecursionState = kind === "array_sum" ? { kind, start: 0, values: Array.from({ length: random.integer(3, 5) }, () => random.integer(1, 6)) } : kind === "recursive_search" ? (() => { const values = Array.from({ length: random.integer(4, 6) }, () => random.integer(1, 9)); const targetIndex = random.integer(1, values.length - 1); return { kind, start: 0, values, target: values[targetIndex] }; })() : { kind, start: random.integer(3, kind === "branching_count" ? 5 : configuration.difficulty === "hard" ? 8 : 6) };
  const solved = solveRecursion(state);
  const list = solved.callOrder.join(" → ");
  const code = kind === "array_sum" ? `function total(values, i):\n  if i = length(values): return 0\n  return values[i] + total(values, i + 1)` : kind === "recursive_search" ? `function find(values, target, i):\n  if i = length(values): return -1\n  if values[i] = target: return i\n  return find(values, target, i + 1)` : kind === "branching_count" ? `function count(n):\n  if n <= 1: return 1\n  return count(n - 1) + count(n - 2)` : kind === "reduce_by_two" ? `function reduce(n):\n  if n <= 0: return 0\n  return n + reduce(n - 2)` : kind === "conditional_reduce" ? `function reduce(n):\n  if n <= 0: return 1\n  if n mod 2 = 0: return 1 + reduce(n - 2)\n  return 1 + reduce(n - 1)` : `function sumDown(n):\n  if n <= 0: return 0\n  return n + sumDown(n - 1)`;
  const questions = [
    makeQuestion({ index: 1, prompt: "What value is returned by the initial call?", family: "return_value", role: "output_prediction", correct: solved.returnValue, alternatives: [solved.returnValue - 1, solved.returnValue + 1, solved.callCount], explanation: `The verified recursive evaluation returns ${solved.returnValue}.`, difficulty: configuration.difficulty, solver: RECURSION_SOLVER_VERSION, random }),
    makeQuestion({ index: 2, prompt: "How many function calls occur, including the base-case call?", family: "call_count", role: "calculation", correct: solved.callCount, alternatives: [solved.callCount - 1, solved.callCount + 1, solved.maxDepth + 1], explanation: `The evaluator records ${solved.callCount} calls.`, difficulty: configuration.difficulty, solver: RECURSION_SOLVER_VERSION, random }),
    makeQuestion({ index: 3, prompt: "What is the maximum active recursion depth, counting the initial call?", family: "recursion_depth", role: "structure_interpretation", correct: solved.maxDepth, alternatives: [solved.maxDepth - 1, solved.maxDepth + 1, Math.max(1, solved.maxDepth - 2)], explanation: `The deepest verified call stack contains ${solved.maxDepth} calls.`, difficulty: configuration.difficulty, solver: RECURSION_SOLVER_VERSION, random }),
    makeQuestion({ index: 4, prompt: "Which sequence gives the argument values in call order?", family: "call_order", role: "tracing", correct: list, alternatives: [solved.callOrder.slice(0, -1).join(" → "), [...solved.callOrder].reverse().join(" → "), [...solved.callOrder, 0].join(" → ")], explanation: `The verified call order is ${list}.`, difficulty: configuration.difficulty, solver: RECURSION_SOLVER_VERSION, random }),
  ];
  return finalize({ id: `recursion-${configuration.seed}-${attempt}`, topic: "recursion", subtopic: kind, difficulty: configuration.difficulty, seed: configuration.seed, attempt, version: RECURSION_GENERATOR_VERSION, title: "Analyze a bounded recursive procedure", blocks: [{ id: "scenario", kind: "paragraph", text: kind === "array_sum" ? `The procedure begins with i = 0 and values = [${state.values?.join(", ")}].` : kind === "recursive_search" ? `Search values = [${state.values?.join(", ")}] for target ${state.target}, starting at i = 0.` : `The initial call uses n = ${state.start}.` }, { id: "pseudocode", kind: "pseudocode", code }, { id: "call-summary", kind: "table", data: { headers: ["measure", "verified trace"], rows: [["initial argument", kind.includes("array") || kind === "recursive_search" ? 0 : state.start], ["maximum allowed depth", 16]] } }], questions, state: state as unknown as JsonValue });
}

export function generateOopSubjectTestlet(configuration: LogicTestletConfiguration, attempt = 1): SubjectTestlet {
  const random = new SeededRandom(`${OOP_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${attempt}`);
  const kind = random.pick<OopState["kind"]>(["counter", "inherited_counter", "paired_account", "encapsulated_counter", "collaborating_accounts", "constructor_chain"]);
  const state: OopState = { kind, initial: random.integer(2, 8), delta: random.integer(1, 4), calls: random.integer(2, 4) };
  const solved = solveOopState(state);
  const code = kind === "inherited_counter" ? `class Counter:\n  value\n  method add(): value = value + ${state.delta}\nclass BoostedCounter inherits Counter:\n  override add(): value = value + ${state.delta + 1}` : kind === "collaborating_accounts" ? `class Account:\n  private balance\n  method transferTo(other):\n    balance = balance - ${state.delta}\n    other.balance = other.balance + ${state.delta}\na = Account(${state.initial}); b = Account(${state.initial})\nrepeat ${state.calls} times: a.transferTo(b)` : kind === "paired_account" ? `class Account:\n  balance\n  method deposit(): balance = balance + ${state.delta}\na = Account(${state.initial})\nb = Account(${state.initial})\nrepeat ${state.calls} times: a.deposit()` : kind === "constructor_chain" ? `class Counter:\n  constructor(start): value = start\nclass TaggedCounter inherits Counter:\n  constructor(start): parent(start + 1)\n  method add(): value = value + ${state.delta}` : kind === "encapsulated_counter" ? `class Counter:\n  private value\n  constructor(start): value = start\n  method increase(): value = value + ${state.delta}\n  method read(): return value` : `class Counter:\n  value\n  constructor(start): value = start\n  method add(): value = value + ${state.delta}\nc = Counter(${state.initial})\nrepeat ${state.calls} times: c.add()`;
  const executableCode = ["inherited_counter", "constructor_chain", "encapsulated_counter"].includes(kind) ? `${code}\nc = ${kind === "constructor_chain" ? "TaggedCounter" : kind === "inherited_counter" ? "BoostedCounter" : "Counter"}(${state.initial})\nrepeat ${state.calls} times: c.${kind === "encapsulated_counter" ? "increase" : "add"}()` : code;
  const diagram = kind === "inherited_counter" || kind === "constructor_chain" ? { nodes: [{ id: "base", label: "Counter" }, { id: "child", label: kind === "constructor_chain" ? "TaggedCounter" : "BoostedCounter" }], edges: [{ from: "child", to: "base", label: "inherits" }] } : kind === "paired_account" || kind === "collaborating_accounts" ? { nodes: [{ id: "a", label: "Account a" }, { id: "b", label: "Account b" }], edges: [{ from: "a", to: "b", label: kind === "collaborating_accounts" ? "transfers to" : "independent of" }] } : { nodes: [{ id: "object", label: "Counter object" }, { id: "state", label: kind === "encapsulated_counter" ? "private value" : "value" }], edges: [{ from: "object", to: "state", label: "owns" }] };
  const questions = [
    makeQuestion({ index: 1, prompt: "What value is stored in the modified object after all method calls?", family: "object_state", role: "state_prediction", correct: solved.finalValue, alternatives: [state.initial, solved.finalValue - 1, solved.finalValue + 1], explanation: `The rule interpreter finishes with value ${solved.finalValue}.`, difficulty: configuration.difficulty, solver: OOP_SOLVER_VERSION, random }),
    makeQuestion({ index: 2, prompt: "What value is returned or observable after the first method call?", family: "method_effect", role: "direct_application", correct: solved.methodResults[0], alternatives: [state.initial, state.delta, solved.methodResults.at(-1) ?? 0], explanation: `The first verified transition produces ${solved.methodResults[0]}.`, difficulty: configuration.difficulty, solver: OOP_SOLVER_VERSION, random }),
    makeQuestion({ index: 3, prompt: kind === "inherited_counter" ? "Which increment is applied by the overridden method?" : kind === "constructor_chain" ? "Which value is established after constructor chaining, before method calls?" : "Which value was established by construction before method calls?", family: kind === "inherited_counter" ? "overriding_behavior" : "constructor_state", role: "interpretation", correct: kind === "inherited_counter" ? state.delta + 1 : kind === "constructor_chain" ? state.initial + 1 : state.initial, alternatives: [state.delta, state.initial, solved.finalValue], explanation: "The answer follows the explicitly supplied class and construction rules.", difficulty: configuration.difficulty, solver: OOP_SOLVER_VERSION, random }),
    makeQuestion({ index: 4, prompt: kind === "paired_account" || kind === "collaborating_accounts" ? "What pair gives the final balances of a and b?" : "How many state-changing method calls were executed?", family: kind === "paired_account" || kind === "collaborating_accounts" ? "object_relationship" : "call_sequence", role: kind === "paired_account" || kind === "collaborating_accounts" ? "comparison" : "calculation", correct: kind === "paired_account" || kind === "collaborating_accounts" ? solved.objectValues.join(", ") : state.calls, alternatives: kind === "paired_account" || kind === "collaborating_accounts" ? [[state.initial, solved.finalValue].join(", "), [solved.finalValue, solved.finalValue].join(", "), [state.initial, state.initial].join(", ")] : [state.calls - 1, state.calls + 1, state.delta], explanation: kind === "paired_account" || kind === "collaborating_accounts" ? `The verified object pair is ${solved.objectValues.join(", ")}.` : `${state.calls} method calls are explicitly executed.`, difficulty: configuration.difficulty, solver: OOP_SOLVER_VERSION, random }),
  ];
  return finalize({ id: `oop-${configuration.seed}-${attempt}`, topic: "basic_oop", subtopic: kind, difficulty: configuration.difficulty, seed: configuration.seed, attempt, version: OOP_GENERATOR_VERSION, title: "Trace a small object-oriented system", blocks: [{ id: "scenario", kind: "paragraph", text: "Use only the class semantics stated below; no language-specific behavior is assumed." }, { id: "class-relationships", kind: "uml_diagram", data: diagram }, { id: "pseudocode", kind: "pseudocode", code: executableCode }], questions: questions.map((question) => ({ ...question, stimulusBlockIds: ["scenario", "class-relationships", "pseudocode"] })), state: state as unknown as JsonValue });
}

function generateUnique(configuration: LogicTestletConfiguration, accepted: ReadonlySet<string>, generator: (configuration: LogicTestletConfiguration, attempt: number) => SubjectTestlet, family: "recursion_testlet" | "oop_testlet"): GeneratedSubjectTestlet {
  for (let attempt = 1; attempt <= (configuration.maxAttempts ?? 500); attempt += 1) {
    const testlet = generator(configuration, attempt);
    if (!accepted.has(testlet.metadata.fingerprint)) return adaptSubjectTestletForDelivery(testlet, configuration, family);
  }
  throw new Error(`Unable to generate a unique ${family} in the configured attempts.`);
}

export const generateValidatedRecursionSubjectTestlet = (configuration: LogicTestletConfiguration, accepted: ReadonlySet<string> = new Set()) => generateUnique(configuration, accepted, generateRecursionSubjectTestlet, "recursion_testlet");
export const generateValidatedOopSubjectTestlet = (configuration: LogicTestletConfiguration, accepted: ReadonlySet<string> = new Set()) => generateUnique(configuration, accepted, generateOopSubjectTestlet, "oop_testlet");
export const reproduceValidatedRecursionSubjectTestlet = (configuration: LogicTestletConfiguration, attempt: number) => adaptSubjectTestletForDelivery(generateRecursionSubjectTestlet(configuration, attempt), configuration, "recursion_testlet");
export const reproduceValidatedOopSubjectTestlet = (configuration: LogicTestletConfiguration, attempt: number) => adaptSubjectTestletForDelivery(generateOopSubjectTestlet(configuration, attempt), configuration, "oop_testlet");
