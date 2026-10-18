import { EvalDelta, EvalMap } from "@/components/eval-parent";
import { EvalEnd, EvalQuestion, EvalRun, EvalStart } from "@/components/eval-check";
import { Shell } from "@/components/site-header";
import { sampleDeltas, sampleEnd, sampleMap, sampleQuestion } from "@/lib/eval/samples";
import type { EvalForm, EvalGrade } from "@/lib/eval/types";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Check-in sample",
};

const SCENES = ["start", "question", "end", "map", "delta", "run"] as const;

export default async function EvalPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string; form?: string; grade?: string }>;
}) {
  const params = await searchParams;
  const scene = SCENES.includes(params.scene as (typeof SCENES)[number]) ? params.scene : "start";
  const form: EvalForm = params.form === "post" ? "post" : "pre";
  const gradeNumber = Number(params.grade ?? 3);
  const grade = (gradeNumber >= 1 && gradeNumber <= 6 ? gradeNumber : 3) as EvalGrade;

  return (
    <Shell role="public" homeHref="/preview/eval">
      <div className="mt-6">
        <p className="hint mb-3">Sample check-in. Draft questions stay off the practice path.</p>
        {scene === "start" ? <EvalStart form={form} /> : null}
        {scene === "question" ? <QuestionScene /> : null}
        {scene === "end" ? <EndScene /> : null}
        {scene === "map" ? <MapScene /> : null}
        {scene === "delta" ? <DeltaScene /> : null}
        {scene === "run" ? <EvalRun grade={grade} form={form} moveAhead={false} /> : null}
      </div>
    </Shell>
  );
}

function QuestionScene() {
  const filled = sampleQuestion();
  return <EvalQuestion prompt={filled.prompt} answer={filled.answer} />;
}

function EndScene() {
  const end = sampleEnd();
  return <EvalEnd known={end.known} starts={end.starts} />;
}

function MapScene() {
  const map = sampleMap();
  return <EvalMap rows={map.rows} prompt={map.prompt} />;
}

function DeltaScene() {
  const delta = sampleDeltas();
  return <EvalDelta rows={delta.rows} note={delta.note} />;
}
