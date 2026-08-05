export function LoadingState() {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="space-y-3">
        <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
        <div className="h-8 w-2/3 animate-pulse rounded-full bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
