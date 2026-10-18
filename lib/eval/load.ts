import type { SupabaseClient } from "@supabase/supabase-js";
import { postIsDue, strandDelta, type StrandDelta } from "@/lib/eval/place";
import {
  ADJUSTED_NOTE,
  LEVEL_LABEL,
  PARENT_CHECK_PROMPT,
  STRAND_LABEL,
  type EvalLevel,
  type EvalStrand,
} from "@/lib/eval/types";

export type EvalMapRow = { strand: string; label: string; level: string };

export type EvalDesk = {
  prompt: string | null;
  note: string | null;
  map: EvalMapRow[] | null;
  deltas: StrandDelta[] | null;
  provisionalIds: string[];
};

const EMPTY: EvalDesk = { prompt: null, note: null, map: null, deltas: null, provisionalIds: [] };

type SessionRow = { id: string; kind: string; completed_at: string | null };
type ResultRow = {
  session_id: string;
  strand: string;
  items_attempted: number;
  correct: number;
  skipped_not_learned: number;
  estimated_level: string;
};
type PlacementRow = { skill_slug: string; status: string; note: string | null };

function rateOf(row: ResultRow): number | null {
  const missed = row.items_attempted - row.correct - row.skipped_not_learned;
  const answered = row.correct + Math.max(0, missed);
  if (answered <= 0) return null;
  return row.correct / answered;
}

function labelFor(strand: string): string {
  return STRAND_LABEL[strand as EvalStrand] ?? strand;
}

function levelLabel(level: string): string {
  return LEVEL_LABEL[level as EvalLevel] ?? level;
}

/** Missing tables return an empty desk. Practice keeps going. */
export async function loadEvalDesk(supabase: SupabaseClient, childId: string): Promise<EvalDesk> {
  const sessions = await supabase
    .from("eval_sessions")
    .select("id, kind, completed_at")
    .eq("child_id", childId)
    .order("started_at", { ascending: false })
    .limit(12);
  if (sessions.error || !sessions.data) return EMPTY;

  const rows = sessions.data as SessionRow[];
  const pre = rows.find((row) => row.kind === "pre" && row.completed_at);
  const post = rows.find((row) => row.kind === "post" && row.completed_at);
  const placements = await supabase
    .from("eval_placements")
    .select("skill_slug, status, note")
    .eq("child_id", childId);
  const placed = placements.error ? [] : ((placements.data ?? []) as PlacementRow[]);
  const provisionalIds = placed.filter((row) => row.status === "provisional").map((row) => row.skill_slug);
  const note = placed.some((row) => row.status === "stepped_back" || row.note === ADJUSTED_NOTE)
    ? ADJUSTED_NOTE
    : null;

  if (!pre?.completed_at) {
    return { ...EMPTY, note, provisionalIds };
  }

  const prompt = postIsDue(new Date(pre.completed_at), new Date(), Boolean(post)) ? PARENT_CHECK_PROMPT : null;
  const resultQuery = await supabase
    .from("eval_results")
    .select("session_id, strand, items_attempted, correct, skipped_not_learned, estimated_level")
    .in("session_id", [pre.id, post?.id].filter((id): id is string => !!id));
  if (resultQuery.error || !resultQuery.data) {
    return { prompt, note, map: null, deltas: null, provisionalIds };
  }
  const results = resultQuery.data as ResultRow[];
  const preRows = results.filter((row) => row.session_id === pre.id);
  const map = preRows.map((row) => ({
    strand: row.strand,
    label: labelFor(row.strand),
    level: levelLabel(row.estimated_level),
  }));

  if (!post) return { prompt, note, map, deltas: null, provisionalIds };

  const postRows = results.filter((row) => row.session_id === post.id);
  const deltas = preRows
    .map((before) => {
      const after = postRows.find((row) => row.strand === before.strand);
      const beforeRate = rateOf(before);
      const afterRate = after ? rateOf(after) : null;
      if (beforeRate == null || afterRate == null) return null;
      return strandDelta(labelFor(before.strand), beforeRate, afterRate);
    })
    .filter((row): row is StrandDelta => !!row);

  return { prompt: null, note, map: null, deltas, provisionalIds };
}

export async function loadProvisionalIds(supabase: SupabaseClient, childId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("eval_placements")
    .select("skill_slug, status")
    .eq("child_id", childId)
    .eq("status", "provisional");
  if (error || !data) return [];
  return (data as { skill_slug: string }[]).map((row) => row.skill_slug).filter((id) => id.length > 0);
}
