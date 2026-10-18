import { CreateParentCard } from "@/components/create/parent-card";
import { Shell } from "@/components/site-header";
import type { SessionMeta } from "@/lib/create/session-meta";

export const metadata = { robots: { index: false, follow: false }, title: "Create parent sample" };

const rows: SessionMeta[] = [
  {
    child_id: "preview-child",
    project_type: "story",
    started_at: "2026-10-11T15:00:00.000Z",
    finished_at: "2026-10-11T15:20:00.000Z",
    steps_completed: 6,
    keep_count: 4,
    retry_count: 0,
    fix_count: 0,
    mismatch_flags: [],
    reflection_taps: [],
    used_write_my_own: false,
  },
  {
    child_id: "preview-child",
    project_type: "story",
    started_at: "2026-10-18T15:00:00.000Z",
    finished_at: "2026-10-18T15:20:00.000Z",
    steps_completed: 6,
    keep_count: 2,
    retry_count: 3,
    fix_count: 1,
    mismatch_flags: [2],
    reflection_taps: ["changed-colour"],
    used_write_my_own: false,
  },
];

export default async function PreviewParentCard({
  searchParams,
}: {
  searchParams: Promise<{ open?: string }>;
}) {
  const params = await searchParams;
  return (
    <Shell role="parent" action={null}>
      <article className="card mt-6 grid gap-4">
        <h2 className="text-2xl font-semibold">Sam</h2>
        <p className="hint">Enrolled in Grade 3</p>
        <section className="parent-progress" aria-label="This week">
          <h3 className="font-semibold">Learned this week</h3>
          <p className="hint mt-2">Place value.</p>
        </section>
        <CreateParentCard rows={rows} open={params.open === "1"} />
      </article>
    </Shell>
  );
}
