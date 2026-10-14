"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { answersMatch } from "@/lib/practice/answers";
import { classifyMistake, noteMistake } from "@/lib/practice/mistakes";
import { applyLearning } from "@/lib/practice/learning";
import { givenAnswer } from "@/lib/practice/parts";
import { buildPortrait } from "@/lib/practice/portrait";
import {
  cardFor,
  issueQuestion,
  loadAttemptLog,
  loadCards,
  totals,
} from "@/lib/practice/session";
import { skillById } from "@/lib/practice/skills";
import { accuracyScheduler, describeCatalog, type SkillCard } from "@/lib/practice/scheduler";
import { readStoredPlan, unpackStoredAnswer } from "@/lib/practice/stored-answer";
import type { PracticeState } from "@/lib/practice/types";
import { torontoDate } from "@/lib/digest/build";
import { isSupportedGrade } from "@/lib/grades";
import { friendlyDbError } from "@/lib/db-error";
import { requireStudent } from "@/lib/auth/student";
import { gradeAccessFrom, gradeIsOpen, type GradeAccess } from "@/lib/practice/grade-access";

type PendingAnswer = {
  id: string;
  child_id: string;
  skill_id: string;
  prompt: string;
  answer: string;
};

function replaceCard(cards: SkillCard[], card: SkillCard): SkillCard[] {
  return cards.filter((item) => item.skillId !== card.skillId).concat(card);
}

async function snapshot(
  supabase: SupabaseClient,
  childId: string,
  access: GradeAccess,
  cards: SkillCard[],
  extra: PracticeState,
): Promise<PracticeState> {
  const score = totals(cards);
  const today = torontoDate();
  const focus = accuracyScheduler.chooseSkill({
    grade: access.working,
    cards,
    sessionCount: 0,
    today,
  });
  const log = await loadAttemptLog(supabase, childId);
  const portrait = buildPortrait({
    grade: access.working,
    cards,
    attempts: log.attempts,
    today,
  });
  return {
    attempted: score.attempted,
    correctCount: score.correct,
    focusTitle: focus.title,
    skills: describeCatalog(access, cards),
    streakDays: portrait.streakDays,
    streakMilestone: portrait.streakMilestone,
    recap: portrait.recap,
    requestedGrade: access.requested,
    workingGrade: access.working,
    ...extra,
    ...(log.error ? { error: extra.error ?? log.error } : {}),
  };
}

async function saveCard(
  supabase: SupabaseClient,
  childId: string,
  card: SkillCard,
): Promise<string | null> {
  const { error } = await supabase.from("skill_states").upsert(
    {
      child_id: childId,
      skill_id: card.skillId,
      attempted: card.attempted,
      correct: card.correct,
      streak: card.streak,
      fsrs: card.fsrs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,skill_id" },
  );
  return error ? friendlyDbError(error) : null;
}

async function ownedChild(childId: string): Promise<
  | { supabase: SupabaseClient; access: GradeAccess }
  | { error: string }
> {
  const session = await requireStudent();
  if ("error" in session) return { error: session.error };
  if (session.child.id !== childId) {
    return { error: "That practice session is not available." };
  }
  const access = gradeAccessFrom({
    enrolled: session.child.grade,
    working: session.child.working_grade,
    nextUnlocked: session.child.next_grade_unlocked,
    requested: session.child.requested_grade,
  });
  if (!access) return { error: "That child profile is not available for practice." };
  return { supabase: session.supabase, access };
}

export async function submitAnswer(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const childId = String(formData.get("childId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!childId || !questionId) return { error: "That question could not be checked." };

  const owned = await ownedChild(childId);
  if ("error" in owned) return { error: owned.error };
  const { supabase, access } = owned;

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
  const storedPlan = readStoredPlan(question.answer);
  const given = givenAnswer(unpacked.answer, {
    answer: String(formData.get("answer") ?? ""),
    remainder: String(formData.get("remainder") ?? ""),
  });
  const correct = answersMatch(unpacked.answer, given);
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  const current = cardFor(cards, question.skill_id);
  const applied = applyLearning({
    card: current,
    correct,
    kind: storedPlan.kind,
    today: torontoDate(),
    rollbackCard: storedPlan.rollbackSkillId ? cardFor(cards, storedPlan.rollbackSkillId) : null,
  });
  let nextCard = applied.card;
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

  const stateError = await saveCard(supabase, childId, nextCard);
  if (stateError) return { error: stateError };
  if (applied.extra && applied.extra.skillId !== nextCard.skillId) {
    const extraError = await saveCard(supabase, childId, applied.extra);
    if (extraError) return { error: extraError };
  }

  const { error: attemptError } = await supabase.from("attempts").insert({
    child_id: childId,
    skill_id: question.skill_id,
    prompt: question.prompt,
    expected: unpacked.answer,
    given,
    correct,
  });
  if (attemptError) return { error: friendlyDbError(attemptError) };

  let updatedCards = replaceCard(cards, nextCard);
  if (applied.extra && applied.extra.skillId !== nextCard.skillId) {
    updatedCards = replaceCard(updatedCards, applied.extra);
  }
  const questionSkill = skillById(question.skill_id);
  const scheduleGrade =
    coach && questionSkill && isSupportedGrade(questionSkill.grade)
      ? questionSkill.grade
      : access.working;
  const issued = await issueQuestion(
    supabase,
    childId,
    scheduleGrade,
    updatedCards,
    coach ? { skillId: question.skill_id, small: true } : undefined,
  );
  if (!issued.question) return { error: issued.error ?? "Could not load the next question." };

  return snapshot(supabase, childId, access, updatedCards, {
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
  const { supabase, access } = owned;

  const skill = skillById(skillId);
  if (!skill || !isSupportedGrade(skill.grade)) return { error: "That skill is not available." };

  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  let nextAccess = access;
  if (!gradeIsOpen(access, skill.grade) || skill.grade !== access.working) {
    const { error } = await supabase.rpc("request_working_grade", { p_grade: skill.grade });
    if (error) return { error: friendlyDbError(error) };
    const refreshed = await supabase
      .from("children")
      .select("grade, working_grade, next_grade_unlocked, requested_grade")
      .maybeSingle();
    if (refreshed.error) return { error: friendlyDbError(refreshed.error) };
    const read = gradeAccessFrom({
      enrolled: refreshed.data?.grade ?? access.enrolled,
      working: refreshed.data?.working_grade,
      nextUnlocked: refreshed.data?.next_grade_unlocked,
      requested: refreshed.data?.requested_grade,
    });
    if (!read) return { error: "That grade is not available." };
    nextAccess = read;
  }

  if (nextAccess.working !== skill.grade) {
    return snapshot(supabase, childId, nextAccess, cards, {
      requestNote: `Grade ${skill.grade} is visible. A parent needs to approve it before practice moves there.`,
      requestedGrade: skill.grade,
    });
  }

  const issued = await issueQuestion(supabase, childId, skill.grade, cards, {
    skillId,
    explicit: true,
  });
  if (!issued.question) return { error: issued.error ?? "Could not load that skill." };

  return snapshot(supabase, childId, nextAccess, cards, {
    next: issued.question,
    requestNote: undefined,
    requestedGrade: nextAccess.requested,
  });
}

/** Student practice jump into a skill that needs review. */
export async function openSkill(formData: FormData): Promise<void> {
  const childId = String(formData.get("childId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  if (!childId || !skillId) redirect("/practice");

  const owned = await ownedChild(childId);
  if ("error" in owned) redirect("/practice");
  const { supabase, access } = owned;

  const skill = skillById(skillId);
  if (!skill || !isSupportedGrade(skill.grade) || !gradeIsOpen(access, skill.grade)) {
    redirect("/practice");
  }

  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) redirect("/practice");

  if (skill.grade !== access.working) {
    const { error } = await supabase.rpc("adopt_working_grade", { p_grade: skill.grade });
    if (error) redirect("/practice");
  }

  const issued = await issueQuestion(supabase, childId, skill.grade, cards, {
    skillId,
    explicit: true,
  });
  if (!issued.question) redirect("/practice");
  redirect(`/practice/${childId}`);
}

export async function practiceAction(
  previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const intent = String(formData.get("intent") ?? "answer");
  if (intent === "choose") return chooseSkill(previous, formData);
  return submitAnswer(previous, formData);
}
