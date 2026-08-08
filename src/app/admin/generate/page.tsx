import { UnifiedQuestionGenerator } from "@/components/admin/equation-generator";
import { PageShell } from "@/components/layout/page-shell";
import { requireRole } from "@/lib/auth/guards";

export default async function GenerateQuestionsPage() {
  const { roles } = await requireRole(["admin"]);

  return (
    <PageShell
      eyebrow="Validated generation"
      title="Generate validated questions"
      description="Generate deterministic Core questions or validated Computer Science subject units; inspect diagnostics; and deliberately save approved previews as unpublished drafts."
      admin
      roles={roles}
    >
      <UnifiedQuestionGenerator />
    </PageShell>
  );
}
