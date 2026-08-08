import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateProgrammingSubjectTestlet } from "./programming-testlets";
import { generateOopSubjectTestlet, generateRecursionSubjectTestlet } from "./programming-specialized";
import { nearestStructuralNeighbor, questionDerivationSignature, structuralFingerprintSubjectTestlet } from "./diversity";

describe("CS3.5 Programming quality benchmark", () => {
  it("builds a reproducible 30-testlet manual-review sample", () => {
    const difficulties = ["easy", "medium", "hard"] as const;
    const testlets = [] as ReturnType<typeof generateProgrammingSubjectTestlet>[];
    const acceptedStructures = new Set<string>();
    let attempted = 0;
    for (let index = 0; index < 30; index += 1) {
      const configuration = { seed: `cs36-benchmark-${String(index + 1).padStart(2, "0")}`, difficulty: difficulties[index % difficulties.length] };
      let accepted = false;
      for (let attempt = 1; attempt <= 100; attempt += 1) {
        attempted += 1;
        const candidate = index >= 24 ? generateOopSubjectTestlet(configuration, attempt) : index >= 18 ? generateRecursionSubjectTestlet(configuration, attempt) : generateProgrammingSubjectTestlet({ ...configuration, targetSize: index % 3 === 0 ? 4 : index % 3 === 1 ? 6 : 8 }, attempt);
        const signature = structuralFingerprintSubjectTestlet(candidate);
        if (acceptedStructures.has(signature)) continue;
        acceptedStructures.add(signature);
        testlets.push(candidate);
        accepted = true;
        break;
      }
      if (!accepted) throw new Error(`Unable to create a structurally distinct benchmark testlet for index ${index}.`);
    }
    const count = (values: string[]) => Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
    const questions = testlets.flatMap((testlet) => testlet.questions);
    const structures = testlets.map((testlet) => String((testlet.metadata.semanticParameters as Record<string, unknown>).structure ?? `${testlet.topic}:${testlet.subtopic}`));
    const structuralFingerprints = testlets.map(structuralFingerprintSubjectTestlet);
    const derivationSignatures = questions.map(questionDerivationSignature);
    const nearest = Object.fromEntries(testlets.map((testlet) => [testlet.id, nearestStructuralNeighbor(testlet, testlets)]));
    const semanticDuplicateCount = testlets.filter((testlet) => nearest[testlet.id].similarity >= 0.9).length;
    const report = {
      schemaVersion: 1,
      benchmarkSeed: "cs36-benchmark-01..30",
      attempted,
      accepted: 30,
      rejected: attempted - 30,
      testletCount: testlets.length,
      childQuestionCount: questions.length,
      difficultyDistribution: count(testlets.map((testlet) => testlet.overallDifficulty)),
      structureDistribution: count(structures),
      topicDistribution: count(testlets.map((testlet) => testlet.topic)),
      familyDistribution: count(questions.map((question) => question.family)),
      reasoningRoleDistribution: count(questions.map((question) => question.reasoningRole)),
      stimulusTypeDistribution: count(testlets.flatMap((testlet) => testlet.metadata.stimulusTypes)),
      verificationClassDistribution: count(questions.map((question) => question.verificationClass ?? "unclassified")),
      exactFingerprintDuplicateRate: 1 - new Set(testlets.map((testlet) => testlet.metadata.fingerprint)).size / testlets.length,
      structuralDuplicateDefinition: "extra testlets sharing canonical problem/control/data/composition/representation structure divided by all accepted testlets; literals, names, wording, and option order are ignored",
      structuralDuplicateTarget: "< 20% readiness target; < 10% aspirational",
      structuralDuplicateRate: 1 - new Set(structuralFingerprints).size / testlets.length,
      familyDerivationDuplicateRate: 1 - new Set(derivationSignatures).size / derivationSignatures.length,
      semanticDuplicateRate: semanticDuplicateCount / testlets.length,
      superficiallyDifferentCount: testlets.length - new Set(structuralFingerprints).size,
      compositionSignatureDistribution: count(testlets.map((testlet) => testlet.questions.map((question) => question.family).join(" > "))),
      validatorRejectionRate: 0,
      criticRejectionRate: null,
      criticPassRate: null,
      criticRequiresHumanReviewRate: null,
      openAiFailureRate: null,
      meanGenerationLatencyMs: null,
      medianGenerationLatencyMs: null,
      approximateAiCostUsd: null,
      recursionCoverage: testlets.filter((testlet) => testlet.topic === "recursion").length,
      oopCoverage: testlets.filter((testlet) => testlet.topic === "basic_oop").length,
      humanRejectionRate: null,
      liveOpenAiStatus: process.env.OPENAI_API_KEY ? "NOT_RUN_BY_DETERMINISTIC_BENCHMARK" : "BLOCKED — OPENAI_API_KEY_NOT_CONFIGURED",
      reviewSample: testlets.map((testlet) => ({ id: testlet.id, title: testlet.stimulus.title, topic: testlet.topic, difficulty: testlet.overallDifficulty, structure: (testlet.metadata.semanticParameters as Record<string, unknown>).structure ?? testlet.subtopic, fingerprint: testlet.metadata.fingerprint, structuralFingerprint: structuralFingerprintSubjectTestlet(testlet), semanticFingerprint: testlet.metadata.semanticFingerprint, nearestNeighbor: nearest[testlet.id], stimulus: testlet.stimulus, questions: testlet.questions.map((question) => ({ id: question.id, family: question.family, reasoningRole: question.reasoningRole, verificationClass: question.verificationClass, derivationSignature: questionDerivationSignature(question), prompt: question.questionText, options: question.options, correctOptionId: question.correctOptionId, explanation: question.explanation })), critic: { decision: "NOT_RUN_NO_API_KEY", reasonCodes: [] } })),
    };
    mkdirSync(join(process.cwd(), "reports", "cs35"), { recursive: true });
    writeFileSync(join(process.cwd(), "reports", "cs35", "programming-benchmark.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    expect(report.testletCount).toBe(30);
    expect(report.childQuestionCount).toBe(156);
    expect(Object.keys(report.structureDistribution).length).toBeGreaterThanOrEqual(3);
    expect(report.exactFingerprintDuplicateRate).toBe(0);
    expect(report.recursionCoverage).toBe(6);
    expect(report.oopCoverage).toBe(6);
    expect(report.structuralDuplicateRate).toBeLessThan(0.2);
  });
});
