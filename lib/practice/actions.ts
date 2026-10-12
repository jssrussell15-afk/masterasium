"use server";

import { answersMatch } from "@/lib/practice/answers";
import { accuracyScheduler, recordAttempt } from "@/lib/practice/scheduler";
import { skillById } from "@/lib/practice/skills";
import {
  cardFor,
  issueQuestion,
  loadCards,
  totals,
} from "@/lib/practice/session";
import type { PracticeState } from "@/lib/practice/types";
import { isSupportedGrade } from "@/lib/grades";
import { friendlyDbError } from "@/lib/db-error";
import { requireUser } from "@/lib/auth/session";

type PendingAnswer = {
  id: string;
  child_id: string;
  skill_id: string;
  prompt: string;
  answer: string;
};

type ChildRow = {
  id: string;
  grade: number;
};

export async function submitAnswer(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const childId = String(formData.get("childId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const given = String(formData.get("answer") ?? "");
  if (!childId || !questionId) return { error: "That question could not be checked." };

  const { supabase, user } = await requireUser();
  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, grade")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();

  if (childError) return { error: friendlyDbError(childError) };
  const profile = child as ChildRow | null;
  if (!profile || !isSupportedGrade(profile.grade)) {
    return { error: "That child profile is not available for practice." };
  }

  const { data: pending, error: pendingError } = await supabase
    .from("pending_questions")
    .select("id, child_id, skill_id, prompt, answer")
    .eq("id", questionId)
    .eq("child_id", childId)
    .maybeSingle();

  if (pendingError) return { error: friendlyDbError(pendingError) };
  const question = pending as PendingAnswer | null;
  if (!question) return { error: "That question expired. Refresh the page and try again." };

  const correct = answersMatch(question.answer, given);
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  const nextCard = recordAttempt(cardFor(cards, question.skill_id), correct);
  const { error: stateError } = await supabase.from("skill_states").upsert(
    {
      child_id: childId,
      skill_id: nextCard.skillId,
      attempted: nextCard.attempted,
      correct: nextCard.correct,
      streak: nextCard.streak,
      fsrs: nextCard.fsrs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,skill_id" },
  );
  if (stateError) return { error: friendlyDbError(stateError) };

  const { error: attemptError } = await supabase.from("attempts").insert({
    child_id: childId,
    skill_id: question.skill_id,
    prompt: question.prompt,
    expected: question.answer,
    given,
    correct,
  });
  if (attemptError) return { error: friendlyDbError(attemptError) };

  await supabase.from("pending_questions").delete().eq("child_id", childId);

  const updatedCards = cards
    .filter((card) => card.skillId !== nextCard.skillId)
    .concat(nextCard);
  const issued = await issueQuestion(supabase, childId, profile.grade, updatedCards);
  if (!issued.question) return { error: issued.error ?? "Could not load the next question." };

  const score = totals(updatedCards);
  const focus = accuracyScheduler.chooseSkill({
    grade: profile.grade,
    cards: updatedCards,
    sessionCount: 0,
  });

  return {
    correct,
    expected: question.answer,
    next: issued.question,
    attempted: score.attempted,
    correctCount: score.correct,
    focusTitle: skillById(focus.id)?.title ?? focus.title,
  };
}
