"use server";

import {
  buildDigestSummary,
  renderDigestText,
  torontoDayRange,
  type DigestSummary,
} from "@/lib/digest/build";
import { friendlyDbError, isGradeProgressMissing } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { requireUser } from "@/lib/auth/session";
import { buildPortrait } from "@/lib/practice/portrait";
import { accuracyScheduler } from "@/lib/practice/scheduler";
import { loadAttemptLog, loadCards } from "@/lib/practice/session";

export type DigestState = {
  error?: string;
  message?: string;
  text?: string;
};

export async function saveDigestDraft(
  _previous: DigestState,
  formData: FormData,
): Promise<DigestState> {
  const childId = String(formData.get("childId") ?? "");
  if (!childId) return { error: "Choose a child first." };

  const { supabase, user } = await requireUser();
  const full = await supabase
    .from("children")
    .select("id, first_name, grade, working_grade")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();

  let child = full.data;
  let childError = full.error;
  if (childError && isGradeProgressMissing(childError)) {
    const basic = await supabase
      .from("children")
      .select("id, first_name, grade")
      .eq("id", childId)
      .eq("parent_id", user.id)
      .maybeSingle();
    child = basic.data ? { ...basic.data, working_grade: null } : null;
    childError = basic.error;
  }

  const access = child
    ? gradeAccessFrom({ enrolled: child.grade, working: child.working_grade })
    : null;
  if (childError) return { error: friendlyDbError(childError) };
  if (!child || !access || !isSupportedGrade(child.grade)) {
    return { error: "That child profile is not available." };
  }

  const range = torontoDayRange();
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };
  const log = await loadAttemptLog(supabase, childId);
  if (log.error) return { error: log.error };

  const todayRows = log.attempts.filter((attempt) => attempt.date === range.date);
  const focus = accuracyScheduler.chooseSkill({
    grade: access.working,
    cards,
    sessionCount: 0,
    today: range.date,
  });
  const portrait = buildPortrait({
    grade: access.working,
    cards,
    attempts: log.attempts,
    today: range.date,
  });
  const correct = todayRows.filter((row) => row.correct).length;
  const summary: DigestSummary = buildDigestSummary({
    childFirstName: child.first_name,
    grade: access.working,
    date: range.date,
    attempted: todayRows.length,
    correct,
    focusSkillId: focus.id,
    focusSkillTitle: focus.title,
    recap: portrait.recap,
    streakDays: portrait.streakDays,
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
