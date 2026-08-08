import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCalibrationDashboard } from "@/lib/analytics/data";
import { DEFAULT_CALIBRATION_THRESHOLDS } from "@/lib/analytics/calibration";
import { requireRole } from "@/lib/auth/guards";

function percent(value: number) { return `${Math.round(value * 100)}%`; }

function BreakdownTable({ title, rows }: { title: string; rows: Array<{ label: string; attemptCount: number; accuracy: number; medianResponseTimeSeconds: number; unansweredRate: number }> }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-workspace-border text-on-surface-variant"><th className="py-2">Group</th><th>Responses</th><th>Accuracy</th><th>Median time</th><th>Unanswered</th></tr></thead>
          <tbody>{rows.map((row) => <tr className="border-b border-workspace-border" key={row.label}><td className="py-3 font-medium">{row.label}</td><td>{row.attemptCount}</td><td>{percent(row.accuracy)}</td><td>{row.medianResponseTimeSeconds}s</td><td>{percent(row.unansweredRate)}</td></tr>)}</tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function CalibrationAnalyticsPage() {
  const { roles } = await requireRole(["admin"]);
  const dashboard = await getCalibrationDashboard();
  const anomalous = dashboard.itemCalibration.filter((item) => item.flags.length);
  return (
    <PageShell admin description="Compare immutable generator predictions with observed response outcomes. Flags are review signals, never automatic reclassification." eyebrow="Q7 empirical calibration" roles={roles} title="Difficulty calibration">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-workspace-border bg-surface-low p-4">
        <div><p className="font-semibold">{dashboard.responseCount} analyzable responses</p><p className="text-sm text-on-surface-variant">Item conclusions require at least {DEFAULT_CALIBRATION_THRESHOLDS.minimumEmpiricalSamples} responses.</p></div>
        <div className="flex gap-2"><Button asChild variant="secondary"><Link href={{ pathname: "/admin/analytics/export", query: { format: "csv" } }}>Export CSV</Link></Button><Button asChild variant="secondary"><Link href={{ pathname: "/admin/analytics/export", query: { format: "jsonl" } }}>Export JSONL</Link></Button></div>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <BreakdownTable rows={dashboard.byRequestedDifficulty} title="Generator requested difficulty" />
        <BreakdownTable rows={dashboard.byCalculatedDifficulty} title="Generator calculated difficulty" />
        <BreakdownTable rows={dashboard.byQuestionType} title="Question type" />
        <BreakdownTable rows={dashboard.byQuestionFamily} title="Question family" />
        <BreakdownTable rows={dashboard.byGeneratorVersion} title="Generator version" />
        <BreakdownTable rows={dashboard.byContext} title="Practice vs mock" />
      </div>
      <Card>
        <CardHeader><CardTitle>Items requiring review</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {!anomalous.length ? <p className="text-sm text-on-surface-variant">No adequately sampled item currently crosses a review threshold.</p> : (
            <table className="w-full text-left text-sm"><thead><tr className="border-b border-workspace-border"><th className="py-2">Question</th><th>Predicted</th><th>Responses</th><th>Accuracy</th><th>Median</th><th>Flags</th></tr></thead><tbody>{anomalous.map((item) => <tr className="border-b border-workspace-border" key={item.questionId}><td className="py-3 font-mono text-xs">{item.questionId}</td><td>{item.calculatedDifficulty ?? "unknown"}</td><td>{item.metrics.attemptCount}</td><td>{percent(item.metrics.accuracy)}</td><td>{item.metrics.medianResponseTimeSeconds}s</td><td><div className="flex flex-wrap gap-1">{item.flags.map((flag) => <Badge key={flag} variant="warning">{flag.replaceAll("_", " ")}</Badge>)}</div></td></tr>)}</tbody></table>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
