import { EvalDelta, EvalMap } from "@/components/eval-parent";
import { loadEvalDesk } from "@/lib/eval/load";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function EvalDesk({ supabase, childId }: { supabase: SupabaseClient; childId: string }) {
  const desk = await loadEvalDesk(supabase, childId).catch(() => null);
  if (!desk) return null;
  return (
    <>
      {desk.prompt ? <p className="hint">{desk.prompt}</p> : null}
      {desk.note ? <p className="hint">{desk.note}</p> : null}
      {desk.map && desk.map.length > 0 ? <EvalMap rows={desk.map} /> : null}
      {desk.deltas && desk.deltas.length > 0 ? <EvalDelta rows={desk.deltas} /> : null}
    </>
  );
}
