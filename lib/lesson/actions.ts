"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireStudent } from "@/lib/auth/student";
import { friendlyDbError } from "@/lib/db-error";
import { torontoDate } from "@/lib/digest/build";
import { isSupportedGrade } from "@/lib/grades";
import { lessonById } from "@/lib/lesson/catalog";
import { explainMiss, reduceLesson, reviewPlanDates, settleLessonFeedback } from "@/lib/lesson/flow";
import { holdToMark, isHoldNote, packHold, readHold } from "@/lib/lesson/hold";
import { buildLessonScreen, lessonTask, type LessonScreen } from "@/lib/lesson/screen";
import { feedbackFromMark, markFromState, reduceFeedback } from "@/lib/practice/feedback";
import {
  ensureRun,
  nextReviewDate,
  saveRun,
  saveTalkSample,
  scheduleReviews,
  syncReviewRows,
} from "@/lib/lesson/store";
import { answersMatch } from "@/lib/practice/answers";
import { gradeAccessFrom } from "@/lib/practice/grade-access";
import { applyLearning } from "@/lib/practice/learning";
import { readLearn, writeLearn } from "@/lib/practice/memory";
import { givenAnswer } from "@/lib/practice/parts";
import { cardFor, loadCards } from "@/lib/practice/session";
import { recordAttempt, type SkillCard } from "@/lib/practice/scheduler";
import { skillById } from "@/lib/practice/skills";

export type LessonClientState = {
  error?: string;
  screen: LessonScreen;
};

async function saveCard(supabase: SupabaseClient, childId: string, card: SkillCard): Promise<string | null> {
  const { error } = await supabase.from("skill_states").upsert(
    {
      child_id: childId,
      skill_id: card.skillId,
      attempted: card.attempted,
      correct: card.correct,
      consecutive_correct: card.consecutiveCorrect,
      fsrs: card.fsrs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "child_id,skill_id" },
  );
  return error ? friendlyDbError(error) : null;
}

export async function lessonAction(
  previous: LessonClientState,
  formData: FormData,
): Promise<LessonClientState> {
  const childId = String(formData.get("childId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  const intent = String(formData.get("intent") ?? "continue");
  if (!childId || !skillId) return { ...previous, error: "That lesson could not be opened." };

  const session = await requireStudent();
  if ("error" in session) return { ...previous, error: session.error };
  if (session.child.id !== childId) return { ...previous, error: "That lesson is not available." };

  const access = gradeAccessFrom({
    enrolled: session.child.grade,
    working: session.child.working_grade,
    nextUnlocked: session.child.next_grade_unlocked,
    requested: session.child.requested_grade,
  });
  const skill = skillById(skillId);
  const lesson = lessonById(skillId);
  if (!skill || !lesson || !isSupportedGrade(skill.grade) || !access || access.working !== skill.grade) {
    return { ...previous, error: "That lesson is not open yet." };
  }

  const { supabase } = session;
  const loaded = await ensureRun(supabase, childId, skillId);
  if (loaded.error) return { ...previous, error: loaded.error };
  let completedAt = loaded.completedAt;
  const before = loaded.run;
  const today = torontoDate();
  const hold = readHold(before.feedbackNote, before.feedbackExpected);
  const openRun = hold ? { ...before, feedbackNote: null, feedbackExpected: null } : before;
  const task = lessonTask(openRun, skill);

  if (intent === "check" || intent === "show-how" || intent === "answer") {
    if (!task) return { ...previous, error: "That question is not ready." };
    const given = givenAnswer(task.answer, {
      answer: String(formData.get("answer") ?? ""),
      remainder: String(formData.get("remainder") ?? ""),
    });
    const correct = intent === "show-how" ? false : answersMatch(task.answer, given);
    const result = reduceFeedback(
      feedbackFromMark(holdToMark(hold)),
      intent === "show-how" ? { type: "show-how" } : { type: "check", correct },
    );
    const mark = markFromState(result.state, holdToMark(hold), given, intent === "show-how");
    if (!mark) {
      return { screen: buildLessonScreen(before, skill, lesson, { nextReview: null }) };
    }
    const packed = packHold(mark);
    const held = { ...before, feedbackNote: packed.note, feedbackExpected: packed.expected };
    const savedHold = await saveRun(supabase, childId, held, completedAt);
    if (savedHold) return { ...previous, error: savedHold };
    const { cards } = await loadCards(supabase, childId);
    return {
      screen: buildLessonScreen(held, skill, lesson, {
        nextReview: nextReviewDate(readLearn(cardFor(cards, skillId).fsrs)),
      }),
    };
  }

  let event: Parameters<typeof reduceLesson>[1];
  let correct = false;
  let prompt = "";
  let expected = "";
  let given = "";
  let graded = false;

  if (intent === "next") {
    if (!hold || (hold.phase !== "correct" && hold.phase !== "revealed") || !task) {
      return {
        ...previous,
        error: "Check your answer first.",
        screen: buildLessonScreen(before, skill, lesson, { nextReview: null }),
      };
    }
    prompt = task.prompt;
    expected = task.answer;
    given = hold.given;
    correct = hold.firstTryCorrect;
    event = {
      type: "answer",
      correct,
      note: correct ? null : explainMiss(prompt, expected, given),
      expected,
    };
    graded = true;
  } else if (isHoldNote(before.feedbackNote)) {
    const { cards } = await loadCards(supabase, childId);
    return {
      screen: buildLessonScreen(before, skill, lesson, {
        nextReview: nextReviewDate(readLearn(cardFor(cards, skillId).fsrs)),
      }),
    };
  } else {
    event = { type: "continue" };
  }

  const cleared = hold ? { ...before, feedbackNote: null, feedbackExpected: null } : before;
  const stepped = settleLessonFeedback(reduceLesson(cleared, event));

  if (graded) {
    const { cards, error: cardError } = await loadCards(supabase, childId);
    if (cardError) return { ...previous, error: cardError };
    const current = cardFor(cards, skillId);
    let nextCard: SkillCard;
    if (stepped.review) {
      nextCard = applyLearning({
        card: current,
        correct,
        kind: "review",
        today,
      }).card;
    } else {
      const recorded = recordAttempt(current, correct);
      const learn = { ...readLearn(recorded.fsrs) };
      if (stepped.justCompleted) {
        const plan = reviewPlanDates(today);
        learn.lessonHold = undefined;
        learn.lessonCheck = "passed";
        learn.reviewPlan = plan;
        learn.reviewDueAt = plan[0];
        learn.needsReview = undefined;
        learn.reviewHits = undefined;
      } else {
        learn.lessonHold = true;
      }
      nextCard = { ...recorded, fsrs: writeLearn(recorded.fsrs, learn) };
    }
    const cardErrorSave = await saveCard(supabase, childId, nextCard);
    if (cardErrorSave) return { ...previous, error: cardErrorSave };

    const { error: attemptError } = await supabase.from("attempts").insert({
      child_id: childId,
      skill_id: skillId,
      prompt,
      expected,
      given,
      correct,
    });
    if (attemptError) return { ...previous, error: friendlyDbError(attemptError) };

    if (correct) {
      await saveTalkSample(
        supabase,
        childId,
        before.missedInRound ? "repaired" : "solved",
        skillId,
        prompt,
        expected,
      );
    }
    if (stepped.justCompleted) {
      const scheduled = await scheduleReviews(supabase, childId, skillId, today);
      if (scheduled) return { ...previous, error: scheduled };
      if (!completedAt) completedAt = new Date().toISOString();
    }
    if (stepped.review) {
      await syncReviewRows(supabase, childId, skillId, readLearn(nextCard.fsrs), today);
    }
  }

  const saved = await saveRun(supabase, childId, stepped.run, completedAt);
  if (saved) return { ...previous, error: saved };

  const { cards } = await loadCards(supabase, childId);
  const learn = readLearn(cardFor(cards, skillId).fsrs);
  return {
    screen: buildLessonScreen(stepped.run, skill, lesson, { nextReview: nextReviewDate(learn) }),
  };
}
