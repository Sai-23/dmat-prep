import { canonicalize } from "../fingerprint";
import { SeededRandom } from "../random";
import type { QuestionGenerator } from "../types";
import {
  MATHEMATICAL_EQUATION_DOMAIN,
  MATHEMATICAL_EQUATION_GENERATOR_VERSION,
  type EquationOperator,
  type EquationSolutionStep,
  type EquationStructuralFamily,
  type MathematicalEquation,
  type MathematicalEquationCandidate,
  type MathematicalEquationGenerationConfiguration,
  type MathematicalExpression,
  type VariableAssignment,
} from "./types";

const ESTIMATED_SECONDS = { easy: 15, medium: 35, hard: 55 } as const;
const SYMBOLS = ["A", "B", "C", "D"] as const;

type Difficulty = MathematicalEquationGenerationConfiguration["difficulty"];
type Reasoning = NonNullable<EquationSolutionStep["reasoning"]>;
type BuiltStep = {
  targetSymbol: string;
  equations: MathematicalEquation[];
  dependencies: string[];
  reasoning: Reasoning;
};
type FamilyContext = { roles: string[]; random: SeededRandom };
type BuiltModel = {
  family: EquationStructuralFamily;
  assignment: VariableAssignment;
  equations: MathematicalEquation[];
  steps: BuiltStep[];
  reasoningPath: string[];
  fastestMethod: string;
  hiddenGroupingCount: number;
  relationshipReversalCount: number;
  meaningfulReasoningSteps: number;
};
type FamilyDefinition = {
  id: EquationStructuralFamily;
  difficulty: Difficulty;
  variableCount: 2 | 3 | 4;
  weight: number;
  build: (context: FamilyContext) => Omit<BuiltModel, "family">;
};

const constant = (value: number): MathematicalExpression => ({ kind: "constant", value });
const variable = (symbol: string): MathematicalExpression => ({ kind: "variable", symbol });
const operation = (
  operator: EquationOperator,
  left: MathematicalExpression,
  right: MathematicalExpression,
): MathematicalExpression => ({ kind: "operation", operator, left, right });
const add = (left: MathematicalExpression, right: MathematicalExpression) => operation("add", left, right);
const subtract = (left: MathematicalExpression, right: MathematicalExpression) => operation("subtract", left, right);
const multiply = (left: MathematicalExpression, right: MathematicalExpression) => operation("multiply", left, right);
const divide = (left: MathematicalExpression, right: MathematicalExpression) => operation("divide", left, right);
const scaled = (symbol: string, coefficient: number) => multiply(constant(coefficient), variable(symbol));

function equation(
  left: MathematicalExpression,
  right: MathematicalExpression,
  random: SeededRandom,
): MathematicalEquation {
  if (right.kind === "constant" && left.kind !== "constant") return { left, right };
  return random.boolean(0.28) ? { left: right, right: left } : { left, right };
}

function expressionPrecedence(expression: MathematicalExpression): number {
  if (expression.kind !== "operation") return 3;
  return expression.operator === "multiply" || expression.operator === "divide" ? 2 : 1;
}

function renderExpression(expression: MathematicalExpression, parentPrecedence = 0, isRight = false): string {
  if (expression.kind === "constant") return String(expression.value);
  if (expression.kind === "variable") return expression.symbol;
  const operators: Record<EquationOperator, string> = {
    add: "+",
    subtract: "−",
    multiply: "×",
    divide: "÷",
  };
  const precedence = expressionPrecedence(expression);
  const left = renderExpression(expression.left, precedence);
  const right = renderExpression(expression.right, precedence, true);
  const text = `${left} ${operators[expression.operator]} ${right}`;
  const needsParentheses = precedence < parentPrecedence ||
    (isRight && precedence === parentPrecedence &&
      (expression.operator === "subtract" || expression.operator === "divide"));
  return needsParentheses ? `(${text})` : text;
}

function renderEquation(value: MathematicalEquation): string {
  return `${renderExpression(value.left)} = ${renderExpression(value.right)}`;
}

function createRandom(configuration: MathematicalEquationGenerationConfiguration, attempt: number) {
  if (!configuration.seed.trim()) throw new Error("A non-empty mathematical-equation seed is required.");
  if (!Number.isSafeInteger(attempt) || attempt < 1) {
    throw new RangeError("Generation attempt must be a positive safe integer.");
  }
  return new SeededRandom(
    `${MATHEMATICAL_EQUATION_GENERATOR_VERSION}\u001f${configuration.seed}\u001f${configuration.difficulty}\u001f${canonicalize(configuration.options ?? {})}\u001f${attempt}`,
  );
}

function assignment(entries: Array<[string, number]>): VariableAssignment {
  return Object.fromEntries(entries);
}

function combinedStep(targetSymbol: string, equations: MathematicalEquation[]): BuiltStep {
  return { targetSymbol, equations, dependencies: [], reasoning: "combine_equations" };
}

function dependentStep(
  targetSymbol: string,
  sourceEquation: MathematicalEquation,
  dependencies: string[],
): BuiltStep {
  return { targetSymbol, equations: [sourceEquation], dependencies, reasoning: "substitute" };
}

function buildEasySumDifference({ roles: [a, b], random }: FamilyContext) {
  const bValue = random.integer(1, 6);
  const aValue = bValue + random.integer(1, 5);
  const values = assignment([[a, aValue], [b, bValue]]);
  const sum = equation(add(variable(a), variable(b)), constant(aValue + bValue), random);
  const difference = equation(subtract(variable(a), variable(b)), constant(aValue - bValue), random);
  return {
    assignment: values,
    equations: [sum, difference],
    steps: [combinedStep(a, [sum, difference]), dependentStep(b, sum, [a])],
    reasoningPath: [
      `Add the two relationships so ${b} cancels, giving ${a} = ${aValue}.`,
      `Substitute ${a} = ${aValue} into the sum to get ${b} = ${bValue}.`,
    ],
    fastestMethod: `Add the sum and difference equations to isolate ${a}, then subtract ${aValue} from the sum to find ${b}.`,
    hiddenGroupingCount: 0,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 2,
  };
}

function buildEasyMultiplierDifference({ roles: [a, b], random }: FamilyContext) {
  const coefficient = random.integer(2, 4);
  const bValue = random.integer(1, Math.floor(12 / coefficient));
  const aValue = coefficient * bValue;
  const values = assignment([[a, aValue], [b, bValue]]);
  const relation = equation(scaled(b, coefficient), variable(a), random);
  const difference = equation(subtract(variable(a), variable(b)), constant(aValue - bValue), random);
  return {
    assignment: values,
    equations: [relation, difference],
    steps: [combinedStep(b, [relation, difference]), dependentStep(a, relation, [b])],
    reasoningPath: [
      `Rewrite the multiplier relationship as ${a} = ${coefficient}${b}; the difference then gives ${b} = ${bValue}.`,
      `Use ${a} = ${coefficient}${b} to obtain ${a} = ${aValue}.`,
    ],
    fastestMethod: `Replace ${a} by ${coefficient}${b} in the difference, solve the single short equation for ${b}, then multiply once.`,
    hiddenGroupingCount: 0,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 2,
  };
}

function buildEasyDivisionDifference({ roles: [a, b], random }: FamilyContext) {
  const divisor = random.integer(2, 4);
  const aValue = random.integer(1, Math.floor(12 / divisor));
  const bValue = divisor * aValue;
  const values = assignment([[a, aValue], [b, bValue]]);
  const relation = equation(divide(variable(b), constant(divisor)), variable(a), random);
  const difference = equation(subtract(variable(b), variable(a)), constant(bValue - aValue), random);
  return {
    assignment: values,
    equations: [relation, difference],
    steps: [combinedStep(a, [relation, difference]), dependentStep(b, relation, [a])],
    reasoningPath: [
      `Reverse ${b} ÷ ${divisor} = ${a} to ${b} = ${divisor}${a}; the difference gives ${a} = ${aValue}.`,
      `Multiply ${a} = ${aValue} by ${divisor} to get ${b} = ${bValue}.`,
    ],
    fastestMethod: `Turn the division into ${b} = ${divisor}${a}, substitute it into the difference, and solve mentally.`,
    hiddenGroupingCount: 0,
    relationshipReversalCount: 1,
    meaningfulReasoningSteps: 2,
  };
}

function buildEasyScaledTotal({ roles: [a, b], random }: FamilyContext) {
  const coefficient = random.integer(2, 4);
  const aValue = random.integer(1, Math.floor(12 / (coefficient + 1)));
  const bValue = coefficient * aValue;
  const values = assignment([[a, aValue], [b, bValue]]);
  const relation = equation(scaled(a, coefficient), variable(b), random);
  const total = equation(add(variable(a), variable(b)), constant(aValue + bValue), random);
  return {
    assignment: values,
    equations: [relation, total],
    steps: [combinedStep(a, [relation, total]), dependentStep(b, relation, [a])],
    reasoningPath: [
      `Replace ${b} with ${coefficient}${a} in the total, giving ${a} = ${aValue}.`,
      `Use the multiplier relationship to get ${b} = ${bValue}.`,
    ],
    fastestMethod: `See the total as ${a} + ${coefficient}${a}; divide by ${coefficient + 1}, then multiply once.`,
    hiddenGroupingCount: 0,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 2,
  };
}

function buildMediumHiddenDifference({ roles: [a, b, c, d], random }: FamilyContext) {
  const coefficient = random.integer(2, 3);
  const bValue = random.integer(2, 5);
  const aValue = coefficient * bValue;
  const differenceValue = random.integer(1, 5);
  const cValue = bValue + differenceValue;
  const dValue = coefficient;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const hidden = subtract(variable(c), variable(b));
  const difference = equation(hidden, constant(differenceValue), random);
  const multiplier = equation(scaled(b, coefficient), variable(a), random);
  const grouped = equation(add(variable(a), hidden), constant(aValue + differenceValue), random);
  const quotient = equation(variable(d), divide(variable(a), variable(b)), random);
  return {
    assignment: values,
    equations: [difference, multiplier, grouped, quotient],
    steps: [
      combinedStep(a, [difference, grouped]),
      dependentStep(b, multiplier, [a]),
      dependentStep(c, difference, [b]),
      dependentStep(d, quotient, [a, b]),
    ],
    reasoningPath: [
      `Use ${c} − ${b} = ${differenceValue} inside the grouped equation to get ${a} = ${aValue}.`,
      `From ${coefficient} × ${b} = ${aValue}, obtain ${b} = ${bValue}.`,
      `Use ${c} − ${bValue} = ${differenceValue} to get ${c} = ${cValue}.`,
      `Finally ${d} = ${aValue} ÷ ${bValue}, so ${d} = ${dValue}.`,
    ],
    fastestMethod: `Spot ${c} − ${b} inside the longer equation first. That reveals ${a}; the multiplier, difference, and quotient then finish the chain.`,
    hiddenGroupingCount: 1,
    relationshipReversalCount: 1,
    meaningfulReasoningSteps: 4,
  };
}

function buildMediumHiddenSum({ roles: [a, b, c, d], random }: FamilyContext) {
  const coefficient = random.integer(2, 3);
  const divisor = random.integer(2, 3);
  const aValue = random.integer(2, 4);
  const cValue = coefficient * aValue;
  const dValue = divisor * aValue;
  const bValue = random.integer(1, 5);
  const groupValue = bValue + dValue;
  const totalValue = aValue + bValue + cValue + dValue;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const group = add(variable(b), variable(d));
  const scale = equation(scaled(a, coefficient), variable(c), random);
  const reverse = equation(divide(variable(d), constant(divisor)), variable(a), random);
  const groupEquation = equation(group, constant(groupValue), random);
  const total = equation(add(add(variable(a), variable(c)), group), constant(totalValue), random);
  return {
    assignment: values,
    equations: [scale, reverse, groupEquation, total],
    steps: [
      combinedStep(a, [groupEquation, total, scale]),
      dependentStep(c, scale, [a]),
      dependentStep(d, reverse, [a]),
      dependentStep(b, groupEquation, [d]),
    ],
    reasoningPath: [
      `Replace ${b} + ${d} by ${groupValue} in the total and use ${c} = ${coefficient}${a}; this gives ${a} = ${aValue}.`,
      `The multiplier relationship gives ${c} = ${cValue}.`,
      `Reverse ${d} ÷ ${divisor} = ${aValue} to get ${d} = ${dValue}.`,
      `Use ${b} + ${dValue} = ${groupValue} to get ${b} = ${bValue}.`,
    ],
    fastestMethod: `Insert the known group ${b} + ${d} directly into the total. With ${c} = ${coefficient}${a}, the remaining equation has only ${a}.`,
    hiddenGroupingCount: 1,
    relationshipReversalCount: 1,
    meaningfulReasoningSteps: 4,
  };
}

function buildMediumReverseRelationship({ roles: [a, b, c], random }: FamilyContext) {
  const divisor = random.integer(2, 4);
  const bValue = random.integer(2, 4);
  const aValue = divisor * bValue;
  const differenceValue = random.integer(1, 5);
  const cValue = bValue + differenceValue;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue]]);
  const reverse = equation(divide(variable(a), constant(divisor)), variable(b), random);
  const difference = equation(subtract(variable(c), variable(b)), constant(differenceValue), random);
  const total = equation(add(variable(a), variable(c)), constant(aValue + cValue), random);
  return {
    assignment: values,
    equations: [reverse, difference, total],
    steps: [combinedStep(b, [reverse, difference, total]), dependentStep(a, reverse, [b]), dependentStep(c, difference, [b])],
    reasoningPath: [
      `Rewrite ${a} ÷ ${divisor} = ${b} as ${a} = ${divisor}${b}, and ${c} − ${b} = ${differenceValue} as ${c} = ${b} + ${differenceValue}; the total gives ${b} = ${bValue}.`,
      `Multiply by ${divisor} to obtain ${a} = ${aValue}.`,
      `Add ${differenceValue} to ${bValue} to obtain ${c} = ${cValue}.`,
    ],
    fastestMethod: `Express both ${a} and ${c} in terms of ${b}, substitute once into the total, then read off the other values.`,
    hiddenGroupingCount: 0,
    relationshipReversalCount: 1,
    meaningfulReasoningSteps: 3,
  };
}

function buildMediumMixedGrouping({ roles: [a, b, c, d], random }: FamilyContext) {
  const firstCoefficient = random.integer(2, 3);
  const secondCoefficient = firstCoefficient === 2 ? 3 : 2;
  const aValue = random.integer(2, 4);
  const cValue = firstCoefficient * aValue;
  const dValue = secondCoefficient * aValue;
  const bValue = random.integer(1, 5);
  const groupValue = bValue + dValue;
  const totalValue = aValue + bValue + cValue + dValue;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const cRelation = equation(variable(c), scaled(a, firstCoefficient), random);
  const dRelation = equation(variable(d), scaled(a, secondCoefficient), random);
  const groupExpression = add(variable(b), variable(d));
  const group = equation(groupExpression, constant(groupValue), random);
  const total = equation(add(add(variable(a), variable(c)), groupExpression), constant(totalValue), random);
  return {
    assignment: values,
    equations: [cRelation, dRelation, group, total],
    steps: [
      combinedStep(a, [group, total, cRelation]),
      dependentStep(c, cRelation, [a]),
      dependentStep(d, dRelation, [a]),
      dependentStep(b, group, [d]),
    ],
    reasoningPath: [
      `Use the repeated group ${b} + ${d} = ${groupValue} in the total and ${c} = ${firstCoefficient}${a}; this gives ${a} = ${aValue}.`,
      `The first multiplier gives ${c} = ${cValue}.`,
      `The second multiplier gives ${d} = ${dValue}.`,
      `Subtract ${dValue} from ${groupValue} to get ${b} = ${bValue}.`,
    ],
    fastestMethod: `Collapse ${b} + ${d} in the total, replace ${c} by ${firstCoefficient}${a}, and solve the resulting one-letter equation.`,
    hiddenGroupingCount: 1,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 4,
  };
}

function buildHardTwoGroups({ roles: [a, b, c, d], random }: FamilyContext) {
  const firstCoefficient = random.integer(2, 4);
  let secondCoefficient = random.integer(2, 4);
  if (secondCoefficient === firstCoefficient) secondCoefficient = secondCoefficient === 4 ? 2 : secondCoefficient + 1;
  const aValue = random.integer(1, 4);
  const bValue = random.integer(1, 4);
  const cValue = firstCoefficient * aValue;
  const dValue = secondCoefficient * bValue;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const firstGroup = equation(add(variable(a), variable(b)), constant(aValue + bValue), random);
  const secondGroup = equation(add(variable(c), variable(d)), constant(cValue + dValue), random);
  const firstScale = equation(variable(c), scaled(a, firstCoefficient), random);
  const secondScale = equation(variable(d), scaled(b, secondCoefficient), random);
  return {
    assignment: values,
    equations: [firstGroup, secondGroup, firstScale, secondScale],
    steps: [combinedStep(a, [firstGroup, secondGroup, firstScale, secondScale]), dependentStep(b, firstGroup, [a]), dependentStep(c, firstScale, [a]), dependentStep(d, secondScale, [b])],
    reasoningPath: [
      `Treat ${a} + ${b} and ${c} + ${d} as two groups, then replace ${c} by ${firstCoefficient}${a} and ${d} by ${secondCoefficient}${b}; this isolates ${a} = ${aValue}.`,
      `Use the first group to obtain ${b} = ${bValue}.`,
      `Use ${c} = ${firstCoefficient}${a} to obtain ${c} = ${cValue}.`,
      `Use ${d} = ${secondCoefficient}${b} to obtain ${d} = ${dValue}.`,
    ],
    fastestMethod: `Keep both sums grouped, substitute the two multiplier relationships, and compare the resulting weighted sum with ${a} + ${b}.`,
    hiddenGroupingCount: 2,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 5,
  };
}

function buildHardDependencyChain({ roles: [a, b, c, d], random }: FamilyContext) {
  const offset = random.integer(1, 2);
  const multiplier = random.integer(2, 3);
  const aValue = random.integer(1, 2);
  const bValue = aValue + offset;
  const cValue = multiplier * bValue;
  const dValue = cValue - aValue;
  const totalValue = aValue + bValue + cValue + dValue;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const bRelation = equation(variable(b), add(variable(a), constant(offset)), random);
  const cRelation = equation(variable(c), scaled(b, multiplier), random);
  const dRelation = equation(variable(d), subtract(variable(c), variable(a)), random);
  const total = equation(add(add(variable(a), variable(b)), add(variable(c), variable(d))), constant(totalValue), random);
  return {
    assignment: values,
    equations: [bRelation, cRelation, dRelation, total],
    steps: [combinedStep(a, [bRelation, cRelation, dRelation, total]), dependentStep(b, bRelation, [a]), dependentStep(c, cRelation, [b]), dependentStep(d, dRelation, [a, c])],
    reasoningPath: [
      `Follow the chain ${b} = ${a} + ${offset}, ${c} = ${multiplier}${b}, and ${d} = ${c} − ${a} inside the total; this gives ${a} = ${aValue}.`,
      `Add ${offset} to get ${b} = ${bValue}.`,
      `Multiply ${bValue} by ${multiplier} to get ${c} = ${cValue}.`,
      `Subtract ${aValue} from ${cValue} to get ${d} = ${dValue}.`,
    ],
    fastestMethod: `Write every letter in terms of ${a}, insert the chain into the total, and then work forward once.`,
    hiddenGroupingCount: 1,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 6,
  };
}

function buildHardNestedDependency({ roles: [a, b, c, d], random }: FamilyContext) {
  const multiplier = random.integer(2, 3);
  const aValue = random.integer(1, 3);
  const bValue = random.integer(1, 5);
  const cValue = multiplier * aValue;
  const dValue = cValue + bValue;
  const pairValue = aValue + bValue;
  const totalValue = aValue + cValue + dValue;
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const scale = equation(variable(c), scaled(a, multiplier), random);
  const nested = equation(variable(d), add(variable(c), variable(b)), random);
  const pair = equation(add(variable(a), variable(b)), constant(pairValue), random);
  const total = equation(add(add(variable(a), variable(c)), variable(d)), constant(totalValue), random);
  return {
    assignment: values,
    equations: [scale, nested, pair, total],
    steps: [combinedStep(a, [scale, nested, pair, total]), dependentStep(c, scale, [a]), dependentStep(b, pair, [a]), dependentStep(d, nested, [b, c])],
    reasoningPath: [
      `Use ${b} = ${pairValue} − ${a}, ${c} = ${multiplier}${a}, and ${d} = ${c} + ${b} inside the total; this gives ${a} = ${aValue}.`,
      `The multiplier gives ${c} = ${cValue}.`,
      `The pair gives ${b} = ${bValue}.`,
      `Combine the two known values to obtain ${d} = ${dValue}.`,
    ],
    fastestMethod: `Replace ${b}, ${c}, and then ${d} in that order so the final total becomes a short equation in ${a}.`,
    hiddenGroupingCount: 1,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 5,
  };
}

function buildHardGroupBridge({ roles: [a, b, c, d], random }: FamilyContext) {
  const multiplier = random.integer(2, 4);
  const aValue = random.integer(1, 4);
  const bValue = random.integer(1, 6);
  const cValue = multiplier * aValue;
  const dValue = random.integer(1, 5);
  const values = assignment([[a, aValue], [b, bValue], [c, cValue], [d, dValue]]);
  const firstGroup = equation(add(variable(a), variable(b)), constant(aValue + bValue), random);
  const secondGroup = equation(subtract(variable(c), variable(d)), constant(cValue - dValue), random);
  const scale = equation(variable(c), scaled(a, multiplier), random);
  const bridge = equation(add(variable(b), variable(d)), constant(bValue + dValue), random);
  return {
    assignment: values,
    equations: [firstGroup, secondGroup, scale, bridge],
    steps: [combinedStep(a, [firstGroup, secondGroup, scale, bridge]), dependentStep(b, firstGroup, [a]), dependentStep(c, scale, [a]), dependentStep(d, secondGroup, [c])],
    reasoningPath: [
      `Link the groups ${a} + ${b}, ${c} − ${d}, and ${b} + ${d}, then use ${c} = ${multiplier}${a}; this isolates ${a} = ${aValue}.`,
      `Use the first group to get ${b} = ${bValue}.`,
      `Use the multiplier to get ${c} = ${cValue}.`,
      `Use the difference group to get ${d} = ${dValue}.`,
    ],
    fastestMethod: `Add or subtract the three short group equations so ${b} and ${d} cancel, then replace ${c} with ${multiplier}${a}.`,
    hiddenGroupingCount: 2,
    relationshipReversalCount: 0,
    meaningfulReasoningSteps: 5,
  };
}

export const MATHEMATICAL_EQUATION_FAMILY_REGISTRY: readonly FamilyDefinition[] = [
  { id: "easy_sum_difference", difficulty: "easy", variableCount: 2, weight: 1, build: buildEasySumDifference },
  { id: "easy_multiplier_difference", difficulty: "easy", variableCount: 2, weight: 1, build: buildEasyMultiplierDifference },
  { id: "easy_division_difference", difficulty: "easy", variableCount: 2, weight: 1, build: buildEasyDivisionDifference },
  { id: "easy_scaled_total", difficulty: "easy", variableCount: 2, weight: 1, build: buildEasyScaledTotal },
  { id: "medium_hidden_difference", difficulty: "medium", variableCount: 4, weight: 1.25, build: buildMediumHiddenDifference },
  { id: "medium_hidden_sum", difficulty: "medium", variableCount: 4, weight: 1.5, build: buildMediumHiddenSum },
  { id: "medium_reverse_relationship", difficulty: "medium", variableCount: 3, weight: 0.75, build: buildMediumReverseRelationship },
  { id: "medium_mixed_grouping", difficulty: "medium", variableCount: 4, weight: 1.25, build: buildMediumMixedGrouping },
  { id: "hard_two_groups", difficulty: "hard", variableCount: 4, weight: 1, build: buildHardTwoGroups },
  { id: "hard_dependency_chain", difficulty: "hard", variableCount: 4, weight: 1, build: buildHardDependencyChain },
  { id: "hard_nested_dependency", difficulty: "hard", variableCount: 4, weight: 1, build: buildHardNestedDependency },
  { id: "hard_group_bridge", difficulty: "hard", variableCount: 4, weight: 1, build: buildHardGroupBridge },
] as const;

function selectFamily(difficulty: Difficulty, random: SeededRandom): FamilyDefinition {
  const available = MATHEMATICAL_EQUATION_FAMILY_REGISTRY.filter((family) => family.difficulty === difficulty);
  const totalWeight = available.reduce((total, family) => total + family.weight, 0);
  let position = random.next() * totalWeight;
  for (const family of available) {
    position -= family.weight;
    if (position < 0) return family;
  }
  return available.at(-1) as FamilyDefinition;
}

function buildModel(difficulty: Difficulty, random: SeededRandom): BuiltModel & { variables: string[] } {
  const family = selectFamily(difficulty, random);
  const variables = [...SYMBOLS.slice(0, family.variableCount)];
  const roles = random.shuffle(variables);
  return { family: family.id, variables, ...family.build({ roles, random }) };
}

export class MathematicalEquationGenerator implements QuestionGenerator<MathematicalEquationGenerationConfiguration, MathematicalEquationCandidate> {
  readonly questionType = "mathematical_equation" as const;
  readonly version = MATHEMATICAL_EQUATION_GENERATOR_VERSION;

  generate(configuration: MathematicalEquationGenerationConfiguration, attempt: number): MathematicalEquationCandidate {
    const random = createRandom(configuration, attempt);
    const model = buildModel(configuration.difficulty, random);
    const displayedEquations = random.shuffle(model.equations);
    const solved: string[] = [];
    const solutionPath = model.steps.map((step) => {
      const indices = step.equations.map((item) => displayedEquations.indexOf(item));
      const result: EquationSolutionStep = {
        equationIndex: indices[0],
        ...(indices.length > 1 ? { supportingEquationIndices: indices.slice(1) } : {}),
        targetSymbol: step.targetSymbol,
        knownSymbols: [...solved],
        dependencySymbols: [...step.dependencies],
        reasoning: step.reasoning,
      };
      solved.push(step.targetSymbol);
      return result;
    });
    const edges = model.steps.flatMap((step) =>
      step.dependencies.map((source) => ({ source, target: step.targetSymbol })),
    );
    const explanation = model.reasoningPath.map((step, index) => `${index + 1}. ${step}`).join("\n");

    return {
      questionType: "mathematical_equation",
      module: "core",
      topic: "Mathematical Equations",
      subtopic: "dMAT relationship systems",
      presentation: {
        prompt: "Find the integer value of every letter so that all equations are true.",
        blocks: displayedEquations.map((item) => ({ kind: "formula" as const, expression: renderEquation(item) })),
      },
      structuredData: {
        variables: model.variables,
        equations: displayedEquations,
        domain: { ...MATHEMATICAL_EQUATION_DOMAIN, integersOnly: true },
        dependencyModel: {
          family: model.family,
          solveOrder: model.steps.map((step) => step.targetSymbol),
          edges,
          hiddenGroupingCount: model.hiddenGroupingCount,
          relationshipReversalCount: model.relationshipReversalCount,
          meaningfulReasoningSteps: model.meaningfulReasoningSteps,
        },
      },
      response: { kind: "symbol_assignment", symbols: model.variables },
      correctAnswer: Object.fromEntries(model.variables.map((symbol) => [symbol, model.assignment[symbol]])),
      explanation,
      fastestMethod: model.fastestMethod,
      reasoningPath: model.reasoningPath,
      estimatedSolveTimeSeconds: ESTIMATED_SECONDS[configuration.difficulty],
      solutionPath,
    };
  }
}

export const mathematicalEquationGenerator = new MathematicalEquationGenerator();
