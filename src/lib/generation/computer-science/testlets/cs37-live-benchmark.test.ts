import { loadEnvConfig } from "@next/env";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { acceptCriticResult, applyAiPresentation } from "./hybrid-presentation";
import { nearestStructuralNeighbor, structuralFingerprintSubjectTestlet } from "./diversity";
import { generateProgrammingSubjectTestlet } from "./programming-testlets";
import { generateOopSubjectTestlet, generateRecursionSubjectTestlet } from "./programming-specialized";
import type { SubjectTestlet } from "./types";
import { validateSubjectTestlet } from "./validation";

const liveRequested = process.env.npm_lifecycle_event === "audit:cs37:live";
if (liveRequested) {
  const mutableEnvironment = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  mutableEnvironment.NODE_ENV = "development";
  loadEnvConfig(process.cwd(), true, console, true);
  mutableEnvironment.NODE_ENV = originalNodeEnv;
}

const outputPath = join(process.cwd(), "reports", "cs37", "live-openai-benchmark.json");
const hasKey = liveRequested && Boolean(process.env.OPENAI_API_KEY);

function count(values: string[]) {
  return Object.fromEntries([...new Set(values)].sort().map((value) => [value, values.filter((item) => item === value).length]));
}

function rate(rejections: number, opportunities: number) {
  return opportunities ? rejections / opportunities : 0;
}

describe("CS3.7 live OpenAI benchmark", () => {
  it("records the explicit credential blocker when no key is configured", () => {
    if (!liveRequested || hasKey) return;
    mkdirSync(join(process.cwd(), "reports", "cs37"), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify({ status: "BLOCKED — OPENAI_API_KEY_NOT_CONFIGURED", liveBenchmarkCompleted: false }, null, 2)}\n`, "utf8");
    expect(hasKey).toBe(false);
  });

  (hasKey ? it : it.skip)("runs 30 real presentation and critic passes without mocks", async () => {
    const { generateOpenAiPresentation, reviewWithOpenAiCritic } = await import("./openai-hybrid.server");
    const difficulties = ["easy", "medium", "hard"] as const;
    const accepted: SubjectTestlet[] = [];
    const events: Array<Record<string, unknown>> = [];
    const structural = new Set<string>();
    let totalApiCalls = 0;
    let successfulApiCalls = 0;
    let failedApiCalls = 0;
    let retries = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let schemaRejections = 0;
    let validatorRejections = 0;
    let criticRejections = 0;
    let structuralRejections = 0;
    let semanticRewriteRequests = 0;
    let presentationOpportunities = 0;
    let criticOpportunities = 0;

    for (let index = 0; index < 30; index += 1) {
      let completed = false;
      for (let attempt = 1; attempt <= 12; attempt += 1) {
        if (attempt > 1) retries += 1;
        const configuration = { seed: `cs37-live-${String(index + 1).padStart(2, "0")}`, difficulty: difficulties[index % 3] };
        const deterministic = index >= 24
          ? generateOopSubjectTestlet(configuration, attempt)
          : index >= 18
            ? generateRecursionSubjectTestlet(configuration, attempt)
            : generateProgrammingSubjectTestlet({ ...configuration, targetSize: index % 3 === 0 ? 4 : index % 3 === 1 ? 6 : 8 }, attempt);
        const structuralSignature = structuralFingerprintSubjectTestlet(deterministic);
        if (structural.has(structuralSignature)) {
          structuralRejections += 1;
          continue;
        }

        try {
          presentationOpportunities += 1;
          totalApiCalls += 1;
          let presentation = await generateOpenAiPresentation(deterministic);
          successfulApiCalls += 1;
          inputTokens += presentation.usage.inputTokens;
          outputTokens += presentation.usage.outputTokens;
          let presented: SubjectTestlet;
          try {
            presented = applyAiPresentation(deterministic, presentation.value, { model: presentation.model });
          } catch (error) {
            const message = error instanceof Error ? error.message : "unknown";
            if (message.startsWith("AI_PRESENTATION_REVALIDATION_FAILED")) validatorRejections += 1;
            else schemaRejections += 1;
            events.push({ index, attempt, stage: "presentation_validation", error: message });
            continue;
          }

          const nearest = nearestStructuralNeighbor(presented, accepted);
          if (nearest.similarity >= 0.9) {
            semanticRewriteRequests += 1;
            retries += 1;
            presentationOpportunities += 1;
            totalApiCalls += 1;
            presentation = await generateOpenAiPresentation(deterministic, `Avoid the reasoning experience and narrative architecture nearest to accepted testlet ${nearest.id}; nearest structural similarity was ${nearest.similarity}.`);
            successfulApiCalls += 1;
            inputTokens += presentation.usage.inputTokens;
            outputTokens += presentation.usage.outputTokens;
            try {
              presented = applyAiPresentation(deterministic, presentation.value, { model: presentation.model });
            } catch (error) {
              const message = error instanceof Error ? error.message : "unknown";
              if (message.startsWith("AI_PRESENTATION_REVALIDATION_FAILED")) validatorRejections += 1;
              else schemaRejections += 1;
              events.push({ index, attempt, stage: "rewrite_validation", error: message });
              continue;
            }
          }

          criticOpportunities += 1;
          totalApiCalls += 1;
          const criticResponse = await reviewWithOpenAiCritic(presented);
          successfulApiCalls += 1;
          inputTokens += criticResponse.usage.inputTokens;
          outputTokens += criticResponse.usage.outputTokens;
          const reviewed = acceptCriticResult(presented, criticResponse.value);
          events.push({ id: reviewed.testlet.id, model: presentation.model, presentationLatencyMs: presentation.latencyMs, criticLatencyMs: criticResponse.latencyMs, critic: reviewed.critic, structuralSignature });
          if (reviewed.critic.decision !== "PASS") {
            criticRejections += 1;
            continue;
          }
          structural.add(structuralSignature);
          accepted.push(reviewed.testlet);
          completed = true;
          break;
        } catch (error) {
          failedApiCalls += 1;
          const message = error instanceof Error ? error.message : "unknown";
          events.push({ index, attempt, stage: "provider_or_schema", error: message });
          if (message === "AI_QUOTA_EXHAUSTED") break;
        }
      }
      if (!completed) {
        const failureReport = {
          status: "FAILED_BEFORE_30_ACCEPTED",
          liveBenchmarkCompleted: false,
          stoppedAtTestlet: index + 1,
          totalApiCalls,
          successfulApiCalls,
          failedApiCalls,
          retries,
          schemaRejections,
          validatorRejections,
          criticRejections,
          structuralRejections,
          events,
        };
        mkdirSync(join(process.cwd(), "reports", "cs37"), { recursive: true });
        writeFileSync(outputPath, `${JSON.stringify(failureReport, null, 2)}\n`, "utf8");
        throw new Error(`Live benchmark could not accept testlet ${index + 1}; inspect the credential-safe failure artifact.`);
      }
    }

    const latencies = events.flatMap((event) => typeof event.presentationLatencyMs === "number" && typeof event.criticLatencyMs === "number" ? [event.presentationLatencyMs + event.criticLatencyMs] : []).sort((a, b) => a - b);
    const nearestScores = accepted.map((testlet) => nearestStructuralNeighbor(testlet, accepted).similarity);
    const criticDecisions = events.flatMap((event) => { const critic = event.critic as { decision?: string } | undefined; return critic?.decision ? [critic.decision] : []; });
    const acceptedInvalidCount = accepted.filter((testlet) => !validateSubjectTestlet(testlet).valid).length;
    const syllabusCoverage = {
      Variables: accepted.filter((testlet) => testlet.topic === "programming_trace").length,
      Loops: accepted.filter((testlet) => testlet.topic === "programming_trace").length,
      Arrays: accepted.filter((testlet) => testlet.topic === "programming_trace").length,
      Functions: accepted.filter((testlet) => testlet.topic === "programming_trace").length,
      Recursion: accepted.filter((testlet) => testlet.topic === "recursion").length,
      "Time Complexity": accepted.filter((testlet) => testlet.questions.some((question) => question.family === "loop_condition_complexity")).length,
      "Basic OOP": accepted.filter((testlet) => testlet.topic === "basic_oop").length,
    };
    const report = {
      status: "COMPLETE",
      liveBenchmarkCompleted: true,
      model: accepted[0]?.metadata.modelIdentifier,
      promptVersion: accepted[0]?.metadata.promptVersion,
      generatorVersions: [...new Set(accepted.map((testlet) => testlet.metadata.generatorVersion))],
      totalApiCalls,
      successfulApiCalls,
      failedApiCalls,
      retries,
      tokenUsage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
      estimatedCostUsd: null,
      latencyMs: { mean: latencies.reduce((sum, value) => sum + value, 0) / latencies.length, median: latencies[Math.floor(latencies.length / 2)], minimum: latencies[0], maximum: latencies.at(-1) },
      accepted: accepted.length,
      acceptedInvalidCount,
      rejectionCounts: { schema: schemaRejections, validator: validatorRejections, critic: criticRejections, structural: structuralRejections },
      rejectionRates: { schema: rate(schemaRejections, presentationOpportunities), validator: rate(validatorRejections, presentationOpportunities), critic: rate(criticRejections, criticOpportunities) },
      structuralDuplicateRate: 1 - structural.size / accepted.length,
      semanticDuplicateRate: nearestScores.filter((score) => score >= 0.9).length / accepted.length,
      semanticRewriteRequests,
      syllabusCoverage,
      topicDistribution: count(accepted.map((testlet) => testlet.topic)),
      familyDistribution: count(accepted.flatMap((testlet) => testlet.questions.map((question) => question.family))),
      reasoningRoleDistribution: count(accepted.flatMap((testlet) => testlet.questions.map((question) => question.reasoningRole))),
      criticDecisionDistribution: count(criticDecisions),
      events,
      reviewerSet: accepted.map((testlet) => ({ ...testlet, nearestNeighbor: nearestStructuralNeighbor(testlet, accepted), structuralSignature: structuralFingerprintSubjectTestlet(testlet) })),
    };
    mkdirSync(join(process.cwd(), "reports", "cs37"), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    expect(accepted).toHaveLength(30);
    expect(Object.values(syllabusCoverage).every((coverage) => coverage > 0)).toBe(true);
    expect(acceptedInvalidCount).toBe(0);
    expect(report.structuralDuplicateRate).toBeLessThan(0.2);
  }, 30 * 60_000);
});
