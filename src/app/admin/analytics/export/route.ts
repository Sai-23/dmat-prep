import { getAnalyticsResponses } from "@/lib/analytics/data";
import { requireRole } from "@/lib/auth/guards";

const columns = ["participantId", "attemptId", "questionId", "questionType", "questionFamily", "generatorVersion", "validatorVersion", "requestedDifficulty", "calculatedDifficulty", "outcome", "responseTimeSeconds", "context", "attemptedAt"] as const;

function csvValue(value: unknown): string { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export async function GET(request: Request) {
  await requireRole(["admin"]);
  const rows = await getAnalyticsResponses();
  const format = new URL(request.url).searchParams.get("format") === "jsonl" ? "jsonl" : "csv";
  const safeRows = rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column]])));
  const body = format === "jsonl"
    ? `${safeRows.map((row) => JSON.stringify(row)).join("\n")}\n`
    : `${columns.join(",")}\n${safeRows.map((row) => columns.map((column) => csvValue(row[column])).join(",")).join("\n")}\n`;
  return new Response(body, { headers: { "Content-Type": format === "jsonl" ? "application/x-ndjson; charset=utf-8" : "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="dmat-response-research.${format}"`, "Cache-Control": "private, no-store" } });
}
