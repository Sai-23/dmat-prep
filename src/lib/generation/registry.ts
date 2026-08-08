import type {
  GeneratedQuestionType,
  GenerationConfiguration,
  GenerationCandidate,
  JsonValue,
  QuestionGenerator,
  QuestionSolver,
  QuestionValidator,
} from "./types";

export type GeneratorBundle<
  TCandidate extends GenerationCandidate = GenerationCandidate,
  TSolution extends JsonValue = JsonValue,
> = {
  generator: QuestionGenerator<GenerationConfiguration, TCandidate>;
  solver: QuestionSolver<TCandidate, TSolution>;
  validator: QuestionValidator<TCandidate, TSolution>;
  fingerprint(candidate: TCandidate): JsonValue;
};

export class GeneratorRegistry {
  private readonly bundles = new Map<GeneratedQuestionType, GeneratorBundle>();

  register(bundle: GeneratorBundle): void {
    const { questionType } = bundle.generator;
    if (this.bundles.has(questionType)) {
      throw new Error(`A generator is already registered for ${questionType}.`);
    }
    if (
      bundle.solver.questionType !== questionType ||
      bundle.validator.questionType !== questionType
    ) {
      throw new Error("Generator, solver, and validator question types must match.");
    }
    this.bundles.set(questionType, bundle);
  }

  get(questionType: GeneratedQuestionType): GeneratorBundle {
    const bundle = this.bundles.get(questionType);
    if (!bundle) throw new Error(`No generator is registered for ${questionType}.`);
    return bundle;
  }

  has(questionType: GeneratedQuestionType): boolean {
    return this.bundles.has(questionType);
  }

  list(): GeneratedQuestionType[] {
    return [...this.bundles.keys()];
  }
}
