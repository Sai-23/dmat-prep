import type { PracticeAnswer, PracticeQuestion, PracticeResponse } from "./schemas";

type Option = { id: string; label: string; content: string };
type Source = Omit<PracticeQuestion, "structuredData" | "response" | "options"> & {
  structuredData: unknown;
  metadata: unknown;
  explanation: string;
  options: Option[];
  correctOptionId: string | null;
  sourceType: string;
};

export type PrivatePracticeSnapshot = {
  correctAnswer: unknown;
  explanation: string;
  provenance: Record<string, unknown>;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function createPracticeSnapshots(source: Source): { publicQuestion: PracticeQuestion; privateSnapshot: PrivatePracticeSnapshot } {
  const stored = record(structuredClone(source.structuredData)) ?? {};
  const metadata = record(structuredClone(source.metadata)) ?? {};
  const generation = record(metadata.generation) ?? {};
  let structuredData: unknown = {};
  let response: PracticeResponse;
  let correctAnswer: unknown;

  if (source.sourceType !== "generated") {
    response = { kind: "single_choice", options: source.options };
    correctAnswer = source.correctOptionId;
  } else if (source.questionType === "mathematical_equation") {
    const specification = record(stored.response);
    structuredData = stored.task;
    response = { kind: "symbol_assignment", symbols: Array.isArray(specification?.symbols) ? specification.symbols.filter((item): item is string => typeof item === "string") : [] };
    correctAnswer = metadata.correctAnswer;
  } else if (source.questionType === "latin_square") {
    const specification = record(stored.response);
    const sourceOptions = Array.isArray(specification?.options) ? specification.options : [];
    structuredData = stored.task;
    response = { kind: "single_choice", options: sourceOptions.map((item, index) => {
      const option = record(item);
      return { id: String(option?.id ?? index), label: String(option?.label ?? ""), content: String(option?.content ?? "") };
    }) };
    correctAnswer = metadata.correctAnswer;
  } else if (source.questionType === "figure_sequence") {
    const sequence = structuredClone(stored.sequence) as { missingMatrices?: Array<{ candidates?: Array<{ id: string }> }> };
    const storedAnswers = Array.isArray(metadata.correctAnswer) ? metadata.correctAnswer.map(String) : [];
    const publicAnswers: string[] = [];
    sequence.missingMatrices?.forEach((matrix, matrixIndex) => matrix.candidates?.forEach((candidate, candidateIndex) => {
      const originalId = candidate.id;
      candidate.id = `candidate-${matrixIndex + 1}-${candidateIndex + 1}`;
      if (storedAnswers[matrixIndex] === originalId) publicAnswers[matrixIndex] = candidate.id;
    }));
    structuredData = sequence;
    response = { kind: "two_stage_single_choice" };
    correctAnswer = publicAnswers;
  } else if (source.questionType === "computer_science") {
    const questions = Array.isArray(stored.questions) ? stored.questions : [];
    const answers: Record<string, string> = {};
    const publicQuestions = questions.map((value) => {
      const question = record(value) ?? {};
      const id = String(question.id ?? "");
      answers[id] = String(question.correctOptionId ?? "");
      const publicOptions = Array.isArray(question.options) ? question.options.map((value) => {
        const option = record(value) ?? {};
        return { id: String(option.id ?? ""), label: String(option.label ?? ""), content: option.content };
      }) : [];
      return {
        id,
        questionText: String(question.questionText ?? ""),
        family: String(question.family ?? ""),
        reasoningRole: String(question.reasoningRole ?? ""),
        stimulusBlockIds: Array.isArray(question.stimulusBlockIds) ? question.stimulusBlockIds.map(String) : [],
        difficulty: question.difficulty,
        options: publicOptions,
      };
    });
    structuredData = { stimulus: stored.stimulus, questions: publicQuestions };
    response = { kind: "subject_answers" };
    correctAnswer = answers;
  } else {
    throw new Error("Unsupported generated practice response type.");
  }

  return {
    publicQuestion: {
      id: source.id,
      module: source.module,
      questionType: source.questionType,
      topic: source.topic,
      subtopic: source.subtopic,
      difficulty: source.difficulty,
      questionText: source.questionText,
      passage: source.passage,
      code: source.code,
      formula: source.formula,
      tableData: source.tableData,
      imageUrl: source.imageUrl,
      estimatedTimeSeconds: source.estimatedTimeSeconds,
      structuredData,
      response,
      options: response.kind === "single_choice" ? response.options : [],
    },
    privateSnapshot: { correctAnswer, explanation: source.explanation, provenance: generation },
  };
}

export function gradePracticeAnswer(answer: PracticeAnswer, privateSnapshot: PrivatePracticeSnapshot): boolean {
  const expected = privateSnapshot.correctAnswer;
  if (answer.kind === "single_choice") return answer.optionId === expected;
  if (answer.kind === "symbol_assignment") return JSON.stringify(answer.values, Object.keys(answer.values).sort()) === JSON.stringify(expected, Object.keys(record(expected) ?? {}).sort());
  if (answer.kind === "two_stage_single_choice") return JSON.stringify(answer.optionIds) === JSON.stringify(expected);
  return JSON.stringify(answer.answers, Object.keys(answer.answers).sort()) === JSON.stringify(expected, Object.keys(record(expected) ?? {}).sort());
}
