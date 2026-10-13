"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { answersMatch } from "@/lib/practice/answers";
import { classifyMistake, noteMistake } from "@/lib/practice/mistakes";
import { accuracyScheduler, describeSkills, recordAttempt, type SkillCard } from "@/lib/practice/scheduler";
import { skillById } from "@/lib/practice/skills";
import {
  cardFor,
  issueQuestion,
  loadCards,
  totals,
} from "@/lib/practice/session";
import { unpackStoredAnswer } from "@/lib/practice/stored-answer";
import type { PracticeState } from "@/lib/practice/types";
import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";
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

function snapshot(grade: SupportedGrade, cards: SkillCard[], extra: PracticeState): PracticeState {
  const score = totals(cards);
  const focus = accuracyScheduler.chooseSkill({ grade, cards, sessionCount: 0 });
  return {
    ...extra,
    attempted: score.attempted,
    correctCount: score.correct,
    focusTitle: focus.title,
    skills: describeSkills(grade, cards),
  };
}

async function ownedChild(childId: string): Promise<
  | { supabase: SupabaseClient; grade: SupportedGrade }
  | { error: string }
> {
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
  return { supabase, grade: profile.grade };
}

export async function submitAnswer(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const childId = String(formData.get("childId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  const given = String(formData.get("answer") ?? "");
  if (!childId || !questionId) return { error: "That question could not be checked." };

  const owned = await ownedChild(childId);
  if ("error" in owned) return { error: owned.error };
  const { supabase, grade } = owned;

  const { data: pending, error: pendingError } = await supabase
    .from("pending_questions")
    .select("id, child_id, skill_id, prompt, answer")
    .eq("id", questionId)
    .eq("child_id", childId)
    .maybeSingle();

  if (pendingError) return { error: friendlyDbError(pendingError) };
  const question = pending as PendingAnswer | null;
  if (!question) return { error: "That question expired. Refresh the page and try again." };

  const unpacked = unpackStoredAnswer(question.answer);
  const correct = answersMatch(unpacked.answer, given);
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  let nextCard = recordAttempt(cardFor(cards, question.skill_id), correct);
  let note: string | undefined;
  let coach = false;
  if (!correct) {
    const mistake = classifyMistake(question.prompt, unpacked.answer, given);
    const noted = noteMistake(nextCard, mistake.type);
    nextCard = noted.card;
    if (noted.count % 2 === 0) {
      note = mistake.note;
      coach = true;
    }
  }

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
    expected: unpacked.answer,
    given,
    correct,
  });
  if (attemptError) return { error: friendlyDbError(attemptError) };

  const updatedCards = cards
    .filter((card) => card.skillId !== nextCard.skillId)
    .concat(nextCard);
  const issued = await issueQuestion(
    supabase,
    childId,
    grade,
    updatedCards,
    coach ? { skillId: question.skill_id, small: true } : undefined,
  );
  if (!issued.question) return { error: issued.error ?? "Could not load the next question." };

  return snapshot(grade, updatedCards, {
    correct,
    expected: correct ? undefined : unpacked.answer,
    steps: correct ? undefined : unpacked.steps,
    note,
    next: issued.question,
  });
}

export async function chooseSkill(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const childId = String(formData.get("childId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  if (!childId || !skillId) return { error: "Choose a skill to practice." };

  const owned = await ownedChild(childId);
  if ("error" in owned) return { error: owned.error };
  const { supabase, grade } = owned;

  const skill = skillById(skillId);
  if (!skill || skill.grade !== grade) return { error: "That skill is not in this grade." };

  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  const issued = await issueQuestion(supabase, childId, grade, cards, { skillId });
  if (!issued.question) return { error: issued.error ?? "Could not load that skill." };

  return snapshot(grade, cards, { next: issued.question });
}

export async function practiceAction(
  previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const intent = String(formData.get("intent") ?? "answer");
  if (intent === "choose") return chooseSkill(previous, formData);
  return submitAnswer(previous, formData);
}
