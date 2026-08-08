import "server-only";
import { aiPresentationSchema, criticResultSchema, HYBRID_CRITIC_PROMPT_VERSION, HYBRID_PRESENTATION_PROMPT_VERSION, presentationContract, type AiPresentation, type CriticResult } from "./hybrid-presentation";
import type { SubjectTestlet } from "./types";

type Usage = { inputTokens: number; outputTokens: number };
export type OpenAiGenerationResult<T> = { value: T; model: string; latencyMs: number; usage: Usage };

function jsonSchemaFor(kind: "presentation" | "critic") {
  if (kind === "critic") return { type: "object", additionalProperties: false, required: ["decision", "reasonCodes", "summary"], properties: { decision: { type: "string", enum: ["PASS", "FAIL", "REQUIRES_HUMAN_REVIEW"] }, reasonCodes: { type: "array", items: { type: "string", enum: ["technical_conflict", "technically_incorrect", "ambiguous_wording", "multiple_correct_risk", "insufficient_stimulus", "topic_mismatch", "format_fidelity", "poor_fidelity", "unclear_wording", "weak_distractor", "insufficient_diversity", "semantic_repetition", "repetitive", "memory_only", "difficulty_mismatch"] } }, summary: { type: "string" } } };
  return { type: "object", additionalProperties: false, required: ["title", "scenario", "questions"], properties: { title: { type: "string" }, scenario: { type: "string" }, questions: { type: "array", minItems: 4, maxItems: 8, items: { type: "object", additionalProperties: false, required: ["id", "family", "reasoningRole", "verificationClass", "prompt", "options", "explanation"], properties: { id: { type: "string" }, family: { type: "string" }, reasoningRole: { type: "string" }, verificationClass: { type: "string", enum: ["A", "B", "C"] }, prompt: { type: "string" }, explanation: { type: "string" }, options: { type: "array", minItems: 4, maxItems: 4, items: { type: "object", additionalProperties: false, required: ["id", "valueToken", "displayText"], properties: { id: { type: "string" }, valueToken: { type: "string" }, displayText: { type: "string" } } } } } } } } };
}

async function requestStructured<T>(kind: "presentation" | "critic", input: string, signal?: AbortSignal): Promise<OpenAiGenerationResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI_ASSISTED_GENERATION_UNAVAILABLE");
  const model = process.env.OPENAI_MODEL ?? "gpt-5.6-sol";
  const started = performance.now();
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, signal: signal ?? AbortSignal.timeout(45_000), body: JSON.stringify({ model, store: false, reasoning: { effort: "low" }, input, text: { format: { type: "json_schema", name: `dmat_cs_${kind}`, strict: true, schema: jsonSchemaFor(kind) } } }) });
  if (!response.ok) {
    if (response.status === 429) {
      const failure = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      throw new Error(failure?.error?.code === "insufficient_quota" ? "AI_QUOTA_EXHAUSTED" : "AI_RATE_LIMITED");
    }
    throw new Error(`AI_PROVIDER_ERROR_${response.status}`);
  }
  const payload = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; usage?: { input_tokens?: number; output_tokens?: number } };
  const text = payload.output_text ?? payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
  if (!text) throw new Error("AI_EMPTY_STRUCTURED_OUTPUT");
  return { value: JSON.parse(text) as T, model, latencyMs: Math.round(performance.now() - started), usage: { inputTokens: payload.usage?.input_tokens ?? 0, outputTokens: payload.usage?.output_tokens ?? 0 } };
}

export async function generateOpenAiPresentation(testlet: SubjectTestlet, diversityContext?: string): Promise<OpenAiGenerationResult<AiPresentation>> {
  const contract = presentationContract(testlet);
  const result = await requestStructured<AiPresentation>("presentation", `Create an original, application-oriented dMAT-style presentation for this verified Programming testlet. Vary the application domain, technical framing, data interpretation, scenario constraints, relationships between stimulus elements, question wording, and distractor wording. DO NOT create a superficial reskin, merely rename entities, or reuse the same narrative pattern. Preserve every ID, family, role, verification class, valueToken, option count, and deterministic fact exactly. Do not create definitions-only trivia or reveal answers. ${diversityContext ? `Controlled diversity rewrite requirement: ${diversityContext}` : ""} Return only the required schema. Prompt version: ${HYBRID_PRESENTATION_PROMPT_VERSION}.\n${JSON.stringify(contract)}`);
  return { ...result, value: aiPresentationSchema.parse(result.value) };
}

export async function reviewWithOpenAiCritic(testlet: SubjectTestlet): Promise<OpenAiGenerationResult<CriticResult>> {
  const result = await requestStructured<CriticResult>("critic", `Independently review this testlet for ambiguity, multiple-correct risk, stimulus sufficiency, topic relevance, application-oriented fidelity, clarity, distractor plausibility, diversity, semantic repetition, and difficulty. The deterministic solver remains authoritative; use technical_conflict only to trigger review, never to replace its answer. Return only the required schema. Prompt version: ${HYBRID_CRITIC_PROMPT_VERSION}.\n${JSON.stringify(testlet)}`);
  return { ...result, value: criticResultSchema.parse(result.value) };
}
