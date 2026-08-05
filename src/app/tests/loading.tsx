import { PageShell } from "@/components/layout/page-shell";

export default function TestsLoading() {
  return (
    <PageShell
      eyebrow="Mock tests"
      title="Loading available tests"
      description="Preparing published assessments and access information."
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" />
      </div>
    </PageShell>
  );
}
