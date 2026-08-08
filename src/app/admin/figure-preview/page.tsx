import { FigureSequenceRenderer } from "@/components/questions/figure-sequence-renderer";
import { FigureMatrixSvg } from "@/components/questions/figure-matrix-svg";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/guards";
import {
  FIGURE_RENDERER_FIXTURE,
  FIGURE_TRANSFORMATION_FRAMES,
  FIGURE_TRANSFORMATION_GRID,
} from "@/lib/generation";

export default async function FigureRendererPreviewPage() {
  const { roles } = await requireRole(["admin"]);

  return (
    <PageShell
      eyebrow="G9 renderer fixture"
      title="Inspect the Figure Sequence presentation"
      description="This original static fixture verifies the structural SVG renderer and two-answer interaction. It is not a generated or validated dMAT question."
      admin
      roles={roles}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Structural sequence preview</CardTitle>
            <Badge variant="warning">Fixture only · no generator</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <FigureSequenceRenderer sequence={FIGURE_RENDERER_FIXTURE} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Deterministic transformation replay</CardTitle>
            <Badge variant="success">Engine output</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm leading-6 text-on-surface-variant">
            The arrow moves horizontally, bounces, and rotates. The diamond traverses
            the outer boundary clockwise while cycling colour. Both evolve independently.
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-3">
              {FIGURE_TRANSFORMATION_FRAMES.map((frame) => (
                <div className="w-40 overflow-hidden rounded-md border border-workspace-border bg-white" key={frame.index}>
                  <FigureMatrixSvg
                    frame={frame}
                    grid={FIGURE_TRANSFORMATION_GRID}
                    label={`Transformation frame ${frame.index + 1}`}
                  />
                  <p className="border-t border-workspace-border px-3 py-2 text-center text-xs font-semibold">
                    Frame {frame.index + 1}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </PageShell>
  );
}
