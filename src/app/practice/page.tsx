import { PageShell } from "@/components/layout/page-shell";
import { PracticeExperience } from "@/components/practice/practice-experience";
import { ErrorState } from "@/components/shared/error-state";
import { requireUser } from "@/lib/auth/guards";
import { getActivePracticeAttempt, getPracticeFilters } from "@/lib/practice/data";
import type { PracticeConfig } from "@/lib/practice/schemas";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ question?: string; module?: string }>;
}) {
  const user = await requireUser();
  const query = await searchParams;
  const validQuestionId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    query.question ?? "",
  )
    ? query.question
    : undefined;
  const validModule = query.module === "core" ? query.module : undefined;
  const initialConfig: Partial<PracticeConfig> | undefined = validQuestionId
    ? {
        questionId: validQuestionId,
        module: validModule ?? "core",
        quantity: 1,
        timingMode: "untimed",
      }
    : undefined;

  let filters;
  let initialSession = null;
  let loadError: string | null = null;

  try {
    filters = await getPracticeFilters();
    if (!validQuestionId) {
      initialSession = await getActivePracticeAttempt(user.id);
    }
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load practice configuration.";
  }

  return (
    <PageShell
      eyebrow="Practice mode"
      title="Build a focused practice session"
      description="Choose a module, topic, difficulty, source, session size, and timing mode. Answers are checked securely after each submission."
    >
      {loadError || !filters ? (
        <ErrorState
          title="Practice is not ready"
          description={loadError ?? "Unable to load practice configuration."}
        />
      ) : (
        <PracticeExperience
          filters={filters}
          initialConfig={initialConfig}
          initialSession={initialSession}
        />
      )}
    </PageShell>
  );
}
