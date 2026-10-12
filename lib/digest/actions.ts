"use server";

import { friendlyDbError } from "@/lib/db-error";
import {
  buildDigestSummary,
  renderDigestText,
  torontoDayRange,
  type DigestSummary,
} from "@/lib/digest/build";
import { isSupportedGrade } from "@/lib/grades";
import { requireUser } from "@/lib/auth/session";
import { accuracyScheduler } from "@/lib/practice/scheduler";
import { loadCards } from "@/lib/practice/session";

export type DigestState = {
  error?: string;
  message?: string;
  text?: string;
};

type AttemptRow = { correct: boolean };

export async function saveDigestDraft(
  _previous: DigestState,
  formData: FormData,
): Promise<DigestState> {
  const childId = String(formData.get("childId") ?? "");
  if (!childId) return { error: "Choose a child first." };

  const { supabase, user } = await requireUser();
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, first_name, grade")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (childError) return { error: friendlyDbError(childError) };
  if (!child || !isSupportedGrade(child.grade)) {
    return { error: "That child profile is not available." };
  }

  const range = torontoDayRange();
  const { data: attempts, error: attemptError } = await supabase
    .from("attempts")
    .select("correct")
    .eq("child_id", childId)
    .gte("created_at", range.start.toISOString())
    .lt("created_at", range.end.toISOString());

  if (attemptError) return { error: friendlyDbError(attemptError) };

  const rows = (attempts ?? []) as AttemptRow[];
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  const focus = accuracyScheduler.chooseSkill({
    grade: child.grade,
    cards,
    sessionCount: 0,
  });
  const correct = rows.filter((row) => row.correct).length;
  const summary: DigestSummary = buildDigestSummary({
    childFirstName: child.first_name,
    grade: child.grade,
    date: range.date,
    attempted: rows.length,
    correct,
    focusSkillId: focus.id,
    focusSkillTitle: focus.title,
  });

  const { error } = await supabase.from("digest_stubs").upsert(
    {
      parent_id: user.id,
      child_id: childId,
      period_date: summary.date,
      summary,
      status: "stubbed",
    },
    { onConflict: "parent_id,child_id,period_date" },
  );
  if (error) return { error: friendlyDbError(error) };

  return {
    message: "Draft saved. No email was sent.",
    text: renderDigestText(summary),
  };
}
