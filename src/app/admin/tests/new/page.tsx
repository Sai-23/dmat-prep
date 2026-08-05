import { TestBuilder } from "@/components/admin/test-builder";
import { PageShell } from "@/components/layout/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getAdminQuestionBank } from "@/lib/admin/test-data";
import { requireRole } from "@/lib/auth/guards";

export default async function TestBuilderPage() {
  const { roles } = await requireRole(["admin"]);
  let questionBank = null;
  let loadError: string | null = null;
  try {
    questionBank = await getAdminQuestionBank();
  } catch (error) {
    loadError =
      error instanceof Error
        ? error.message
        : "Unable to load the approved question bank.";
  }

  return (
    <PageShell
      eyebrow="Test builder"
      title="Assemble a structured timed assessment"
      description="Configure test access, sections, timing, question order, and publication using approved questions from the content pipeline."
      admin
      roles={roles}
    >
      {loadError || !questionBank ? (
        <ErrorState
          title="Test builder unavailable"
          description={loadError ?? "Unable to load the approved question bank."}
        />
      ) : questionBank.length === 0 ? (
        <EmptyState
          title="Publish questions before building a test"
          description="The test builder only accepts approved, published questions. Complete the Phase 8 review and publication workflow first."
        />
      ) : (
        <TestBuilder questionBank={questionBank} />
      )}
    </PageShell>
  );
}
