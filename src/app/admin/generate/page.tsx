import { UnifiedQuestionGenerator } from "@/components/admin/equation-generator";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function GenerateQuestionsPage() {
  const { roles } = await requireRole(["admin"]);

  return (
    <PageShell
      eyebrow="Validated generation"
      title="Generate question previews"
      description="Generate and inspect deterministic Core questions. A question remains an unpublished in-memory preview until you explicitly publish it."
      admin
      roles={roles}
    >
      <UnifiedQuestionGenerator />
    </PageShell>
  );
}
