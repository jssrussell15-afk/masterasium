import { needsReviewLine, returnedLine } from "@/lib/reteach/copy";
import { plainSkill } from "@/lib/reteach/prereq";
import type { SupabaseClient } from "@supabase/supabase-js";

type ReteachRow = {
  prerequisite_skill?: string;
  outcome?: string | null;
};

/** Missing table leaves the desk quiet. */
export async function ReteachDesk({ supabase, childId }: { supabase: SupabaseClient; childId: string }) {
  const { data, error } = await supabase
    .from("reteach_events")
    .select("prerequisite_skill, outcome")
    .eq("child_id", childId)
    .order("started_at", { ascending: false })
    .limit(3);
  if (error || !data || data.length === 0) return null;
  const lines = (data as ReteachRow[]).flatMap((row) => {
    if (!row.prerequisite_skill || !row.outcome) return [];
    const plain = plainSkill(row.prerequisite_skill);
    if (row.outcome === "needs_review") return [needsReviewLine(plain)];
    if (row.outcome === "returned") return [returnedLine(plain)];
    return [];
  });
  if (lines.length === 0) return null;
  return (
    <section aria-label="A step back">
      {lines.map((line) => (
        <p key={line} className="hint">
          {line}
        </p>
      ))}
    </section>
  );
}
