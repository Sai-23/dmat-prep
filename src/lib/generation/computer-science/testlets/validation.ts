import { canonicalize } from "../../fingerprint";
import { fingerprintSubjectTestlet, fingerprintSubjectTestletQuestion } from "./fingerprint";
import { COMPUTER_SCIENCE_MODULES, SUBJECT_TESTLET_SCHEMA_VERSION, SUBJECT_TESTLET_VALIDATOR_VERSION, TESTLET_REASONING_ROLES, VERIFICATION_CLASSES, type SubjectStimulusBlock, type SubjectTestlet, type SubjectTestletValidationConfiguration, type SubjectTestletValidationIssue, type SubjectTestletValidationResult } from "./types";

const HIDDEN_ANSWER_KEYS = new Set(["correctOptionId", "correctAnswer", "answerKey", "solution", "verifiedCorrectOptionId"]);

function containsHiddenAnswer(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsHiddenAnswer);
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => HIDDEN_ANSWER_KEYS.has(key) || containsHiddenAnswer(nested));
}

function validBlock(block: SubjectStimulusBlock): boolean {
  if (!block.id.trim()) return false;
  if (block.kind === "paragraph") return Boolean(block.text.trim());
  if ("code" in block) return Boolean(block.code.trim());
  if (block.kind === "formula") return Boolean(block.expression.trim());
  return block.data !== undefined && !containsHiddenAnswer(block.data);
}

function normalizedWords(value: string): Set<string> {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2));
}

function similarity(first: string, second: string): number {
  const a = normalizedWords(first);
  const b = normalizedWords(second);
  const union = new Set([...a, ...b]);
  return union.size ? [...a].filter((word) => b.has(word)).length / union.size : 1;
}

export function validateSubjectTestlet(testlet: SubjectTestlet, configuration: SubjectTestletValidationConfiguration = {}): SubjectTestletValidationResult {
  const minimumQuestions = configuration.minimumQuestions ?? 4;
  const maximumQuestions = configuration.maximumQuestions ?? 8;
  const minimumReasoningRoles = configuration.minimumReasoningRoles ?? Math.min(4, minimumQuestions);
  if (!Number.isInteger(minimumQuestions) || !Number.isInteger(maximumQuestions) || minimumQuestions < 4 || maximumQuestions < minimumQuestions || maximumQuestions > 8) throw new RangeError("Testlet question limits must describe a range from 4 through 8.");
  const issues: SubjectTestletValidationIssue[] = [];
  const issue = (code: string, message: string, questionId?: string) => issues.push({ code, message, ...(questionId ? { questionId } : {}) });

  if (testlet.schemaVersion !== SUBJECT_TESTLET_SCHEMA_VERSION) issue("invalid_schema_version", "Unsupported testlet schema version.");
  if (!COMPUTER_SCIENCE_MODULES.includes(testlet.module)) issue("invalid_module", "Unsupported Computer Science module.");
  if (!testlet.id.trim() || !testlet.topic.trim() || !testlet.subtopic.trim() || !testlet.stimulus.id.trim() || !testlet.stimulus.title.trim()) issue("missing_identity", "Testlet and stimulus identities, topic, and subtopic are required.");
  if (!testlet.stimulus.blocks.length || !testlet.stimulus.blocks.every(validBlock)) issue("invalid_stimulus", "Stimulus blocks must be typed, non-empty, and free of hidden answer data.");
  const blockIds = testlet.stimulus.blocks.map((block) => block.id);
  if (new Set(blockIds).size !== blockIds.length) issue("duplicate_block_id", "Stimulus block IDs must be unique.");
  if (testlet.questions.length < minimumQuestions || testlet.questions.length > maximumQuestions) issue("invalid_question_count", `A testlet must contain ${minimumQuestions} through ${maximumQuestions} questions.`);

  const questionIds = new Set<string>();
  const childFingerprints: string[] = [];
  testlet.questions.forEach((question) => {
    if (typeof question.id !== "string" || !question.id.trim() || questionIds.has(question.id)) issue("duplicate_question_id", "Child question IDs must be present and unique.", question.id);
    questionIds.add(question.id);
    if (typeof question.questionText !== "string" || !question.questionText.trim() || typeof question.family !== "string" || !question.family.trim() || !TESTLET_REASONING_ROLES.includes(question.reasoningRole)) issue("invalid_question_identity", "Question text, family, and reasoning role are required.", question.id);
    if (question.verificationClass && !VERIFICATION_CLASSES.includes(question.verificationClass)) issue("invalid_verification_class", "Verification class must be A, B, or C.", question.id);
    if (question.verificationClass === "C" && testlet.metadata.reviewStatus === "validated") issue("conceptual_review_required", "Class C questions cannot be accepted without human review.", question.id);
    if (!question.stimulusBlockIds.length || question.stimulusBlockIds.some((id) => !blockIds.includes(id))) issue("unrelated_stimulus_reference", "Every child must reference one or more blocks in the shared stimulus.", question.id);
    if (question.options.length !== 4) issue("invalid_option_count", "Every child must have exactly four options.", question.id);
    const optionIds = question.options.map((option) => option.id);
    const optionLabels = question.options.map((option) => option.label);
    const optionValues = question.options.map((option) => canonicalize(option.content));
    if (new Set(optionIds).size !== 4 || new Set(optionLabels).size !== 4 || new Set(optionValues).size !== 4) issue("duplicate_options", "Option IDs, labels, and display values must be unique.", question.id);
    if (optionIds.filter((id) => id === question.correctOptionId).length !== 1) issue("invalid_correct_answer", "Exactly one option must match the stored correct answer.", question.id);
    if (question.validation.ambiguous || question.validation.verifiedCorrectOptionId !== question.correctOptionId) issue("independent_verification_failed", "The independent solver must verify the unique stored answer.", question.id);
    if (!question.validation.solverVersion.trim() || !question.validation.explanationVerified || !question.explanation.trim()) issue("unverified_explanation", "A non-empty explanation must agree with the independently verified answer.", question.id);
    childFingerprints.push(fingerprintSubjectTestletQuestion(question));
  });
  if (new Set(childFingerprints).size !== childFingerprints.length) issue("duplicate_child_fingerprint", "Near-identical child question semantics are not allowed.");
  for (let left = 0; left < testlet.questions.length; left += 1) for (let right = left + 1; right < testlet.questions.length; right += 1) if (similarity(testlet.questions[left].questionText, testlet.questions[right].questionText) > 0.82) issue("near_duplicate_question", "Child question wording is too similar.", testlet.questions[right].id);
  if (new Set(testlet.questions.map((question) => question.reasoningRole)).size < minimumReasoningRoles) issue("insufficient_reasoning_diversity", `Testlet requires at least ${minimumReasoningRoles} distinct reasoning roles.`);

  const expectedStimulusTypes = [...new Set(testlet.stimulus.blocks.map((block) => block.kind))];
  const expectedFamilies = [...new Set(testlet.questions.map((question) => question.family))];
  if (testlet.metadata.testletId !== testlet.id || testlet.metadata.questionCount !== testlet.questions.length || canonicalize(testlet.metadata.stimulusTypes) !== canonicalize(expectedStimulusTypes) || canonicalize(testlet.metadata.questionFamilies) !== canonicalize(expectedFamilies) || testlet.metadata.overallDifficulty !== testlet.overallDifficulty || testlet.metadata.validatorVersion !== SUBJECT_TESTLET_VALIDATOR_VERSION || testlet.metadata.generationAttempts < 1) issue("metadata_mismatch", "Testlet metadata must match its accepted content and validator contract.");
  const testletFingerprint = fingerprintSubjectTestlet(testlet);
  if (testlet.metadata.fingerprint !== testletFingerprint || canonicalize(testlet.metadata.childFingerprints) !== canonicalize(childFingerprints)) issue("fingerprint_mismatch", "Stored child or testlet fingerprints are stale.");
  return issues.length ? { valid: false, issues } : { valid: true, childFingerprints, testletFingerprint };
}
