"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { attemptWritePlan, isAttemptId } from "@/lib/practice/attempt-once";
import { runClaimedLearning } from "@/lib/practice/learning-claim";
import { answersMatch } from "@/lib/practice/answers";
import { feedbackFromMark, markFromState, reduceFeedback, whyLine } from "@/lib/practice/feedback";
import { classifyMistake, noteMistake } from "@/lib/practice/mistakes";
import { buildPracticeEvent, type PracticeEvent } from "@/lib/practice/events";
import { applyLearning } from "@/lib/practice/learning";
import { readLearn, writeLearn, type IntroCycle } from "@/lib/practice/memory";
import { givenAnswer } from "@/lib/practice/parts";
import { buildPortrait } from "@/lib/practice/portrait";
import {
  cardFor,
  issueQuestion,
  loadAttemptLog,
  loadCards,
  loadOrIssueQuestion,
  totals,
} from "@/lib/practice/session";
import { isLessonSkill } from "@/lib/lesson/catalog";
import { syncReviewRows } from "@/lib/lesson/store";
import { practiceAnchor } from "@/lib/practice/placement";
import { loadPlacement } from "@/lib/practice/placement-store";
import { skillById } from "@/lib/practice/skills";
import { accuracyScheduler, describeCatalog, emptyCard, type SkillCard } from "@/lib/practice/scheduler";
import { readAttemptMark, readStoredPlan, unpackStoredAnswer, withAttemptMark } from "@/lib/practice/stored-answer";
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
  const loaded = await loadPlacement(supabase, childId);
  const anchor = practiceAnchor(loaded.placement, access.working);
  const focus = accuracyScheduler.chooseSkill({
    grade: access.working,
    cards,
    sessionCount: 0,
    today,
    startSkillId: anchor.startSkillId,
  });
  const log = await loadAttemptLog(supabase, childId);
  const portrait = buildPortrait({
    grade: access.working,
    cards,
    attempts: log.attempts,
    today,
    startSkillId: anchor.startSkillId,
  });
  return {
    attempted: score.attempted,
    correctCount: score.correct,
    focusTitle: focus.title,
    skills: describeCatalog(access, cards, anchor.startSkillId),
    streakDays: portrait.streakDays,
    streakMilestone: portrait.streakMilestone,
    recap: portrait.recap,
    requestedGrade: access.requested,
    workingGrade: access.working,
    ...extra,
    ...(log.error ? { error: extra.error ?? log.error } : {}),
  };
}

async function persistCards(
  supabase: SupabaseClient,
  childId: string,
  card: SkillCard,
  extra: SkillCard | null,
): Promise<string | null> {
  const stateError = await saveCard(supabase, childId, card);
  if (stateError) return stateError;
  if (extra && extra.skillId !== card.skillId) return saveCard(supabase, childId, extra);
  return null;
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
      consecutive_correct: card.streak,
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

async function loadPending(
  supabase: SupabaseClient,
  childId: string,
  questionId: string,
): Promise<{ question: PendingAnswer } | { error: string }> {
  const { data: pending, error: pendingError } = await supabase
    .from("pending_questions")
    .select("id, child_id, skill_id, prompt, answer")
    .eq("id", questionId)
    .eq("child_id", childId)
    .maybeSingle();
  if (pendingError) return { error: friendlyDbError(pendingError) };
  const question = pending as PendingAnswer | null;
  if (!question) return { error: "That question expired. Refresh the page and try again." };
  return { question };
}

export async function submitAnswer(
  previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const intent = String(formData.get("intent") ?? "check");
  if (intent === "next") return advancePractice(previous, formData);
  if (intent === "show-how" || intent === "give-up") return markPractice(previous, formData, "show-how");
  return markPractice(previous, formData, "check");
}

async function markPractice(
  previous: PracticeState,
  formData: FormData,
  mode: "check" | "show-how",
): Promise<PracticeState> {
  const childId = String(formData.get("childId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!childId || !questionId) return { error: "That question could not be checked." };

  const owned = await ownedChild(childId);
  if ("error" in owned) return { error: owned.error };
  const { supabase, access } = owned;
  const loaded = await loadPending(supabase, childId, questionId);
  if ("error" in loaded) return { error: loaded.error };
  const question = loaded.question;
  const unpacked = unpackStoredAnswer(question.answer);
  const existing = readAttemptMark(question.answer);
  const checkId = String(formData.get("checkId") ?? "");
  if (existing?.clientCheckId && existing.clientCheckId === checkId && isAttemptId(checkId)) {
    const { cards, error: cardError } = await loadCards(supabase, childId);
    if (cardError) return { error: cardError };
    const issued = await loadOrIssueQuestion(supabase, childId, access.working, cards);
    if (!issued.question) return { error: issued.error ?? "Could not keep this question." };
    return snapshot(supabase, childId, access, cards, {
      feedbackFor: question.id,
      phase: existing.phase,
      why: existing.phase === "correct" ? whyLine(unpacked.steps) : null,
      steps: existing.phase === "revealed" ? unpacked.steps : undefined,
      expected: existing.phase === "revealed" ? unpacked.answer : undefined,
      saveNote: "saved",
      next: issued.question,
    });
  }
  const given =
    mode === "show-how"
      ? (existing?.given ?? "")
      : givenAnswer(unpacked.answer, {
          answer: String(formData.get("answer") ?? ""),
          remainder: String(formData.get("remainder") ?? ""),
        });
  const correct = mode === "show-how" ? false : answersMatch(unpacked.answer, given);
  const result = reduceFeedback(
    feedbackFromMark(existing),
    mode === "show-how" ? { type: "show-how" } : { type: "check", correct },
  );
  const marked = markFromState(result.state, existing, given, mode === "show-how");
  if (!marked) return previous;
  const mark = isAttemptId(checkId) ? { ...marked, clientCheckId: checkId } : marked;

  const { error: updateError } = await supabase
    .from("pending_questions")
    .update({ answer: withAttemptMark(question.answer, mark) })
    .eq("id", question.id)
    .eq("child_id", childId);
  if (updateError) return { error: friendlyDbError(updateError) };

  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };
  const issued = await loadOrIssueQuestion(supabase, childId, access.working, cards);
  if (!issued.question) return { error: issued.error ?? "Could not keep this question." };
  return snapshot(supabase, childId, access, cards, {
    feedbackFor: question.id,
    phase: mark.phase,
    why: mark.phase === "correct" ? whyLine(unpacked.steps) : null,
    steps: mark.phase === "revealed" ? unpacked.steps : undefined,
    expected: mark.phase === "revealed" ? unpacked.answer : undefined,
    next: issued.question,
  });
}

async function advancePractice(
  _previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const childId = String(formData.get("childId") ?? "");
  const questionId = String(formData.get("questionId") ?? "");
  if (!childId || !questionId) return { error: "That question could not be checked." };

  const owned = await ownedChild(childId);
  if ("error" in owned) return { error: owned.error };
  const { supabase, access } = owned;
  const attemptId = String(formData.get("attemptId") ?? "");
  const prior = await readClientAttempt(supabase, childId, attemptId);
  if (prior.error) return { error: prior.error };
  const plan = isAttemptId(attemptId) ? attemptWritePlan(prior.row) : "insert";
  if (plan === "skip") return continueAfterSave(supabase, childId, access);
  if (plan === "apply" && prior.row) {
    const applied = await applyStoredAttempt(supabase, childId, attemptId);
    if (applied.error) return { error: applied.error };
    return continueAfterSave(supabase, childId, access, applied.counted);
  }

  const loaded = await loadPending(supabase, childId, questionId);
  if ("error" in loaded) return { error: loaded.error };
  const question = loaded.question;
  const mark = readAttemptMark(question.answer);
  if (!mark || (mark.phase !== "correct" && mark.phase !== "revealed")) {
    return { error: "Check your answer first." };
  }

  const unpacked = unpackStoredAnswer(question.answer);
  const storedPlan = readStoredPlan(question.answer);
  const given = mark.given;
  const correct = mark.firstTryCorrect;
  const { cards, error: cardError } = await loadCards(supabase, childId);
  if (cardError) return { error: cardError };

  const today = torontoDate();
  const current = cardFor(cards, question.skill_id);
  const applied = applyLearning({
    card: current,
    correct,
    kind: storedPlan.kind,
    today,
    rollbackCard: storedPlan.rollbackSkillId ? cardFor(cards, storedPlan.rollbackSkillId) : null,
  });
  let nextCard = applied.card;
  let note: string | undefined;
  let coach = false;
  if (!correct && !mark.showedHow) {
    const mistake = classifyMistake(question.prompt, unpacked.answer, given);
    const noted = noteMistake(nextCard, mistake.type);
    nextCard = noted.card;
    if (noted.count % 2 === 0) {
      note = mistake.note;
      coach = true;
    }
  }
  const seenCycle = introCycleFrom(formData, question.skill_id);
  if (seenCycle) {
    nextCard = {
      ...nextCard,
      fsrs: writeLearn(nextCard.fsrs, {
        ...readLearn(nextCard.fsrs),
        introSeenAt: today,
        introCycle: seenCycle,
      }),
    };
  }

  const inserted = await supabase.from("attempts").insert({
    child_id: childId,
    skill_id: question.skill_id,
    prompt: question.prompt,
    expected: unpacked.answer,
    given,
    correct,
    ...(isAttemptId(attemptId)
      ? { client_attempt_id: attemptId, learning_applied: false }
      : {}),
  });
  if (inserted.error) {
    if (inserted.error.code === "23505" && isAttemptId(attemptId)) {
      const again = await readClientAttempt(supabase, childId, attemptId);
      if (again.error) return { error: again.error };
      if (again.row?.learning_applied) return continueAfterSave(supabase, childId, access);
      if (!again.row) return continueAfterSave(supabase, childId, access, false);
      const applied = await applyStoredAttempt(supabase, childId, attemptId);
      if (applied.error) return { error: applied.error };
      return continueAfterSave(supabase, childId, access, applied.counted);
    }
    return { error: friendlyDbError(inserted.error) };
  }

  if (isAttemptId(attemptId)) {
    const claimed = await runClaimedLearning({
      supabase,
      childId,
      attemptId,
      apply: () => persistCards(supabase, childId, nextCard, applied.extra ?? null),
    });
    if (claimed.error) return { error: claimed.error };
    if (!claimed.counted) return continueAfterSave(supabase, childId, access, false);
  } else {
    const stateError = await persistCards(supabase, childId, nextCard, applied.extra ?? null);
    if (stateError) return { error: stateError };
  }
  if (isLessonSkill(question.skill_id)) {
    await syncReviewRows(supabase, childId, question.skill_id, readLearn(nextCard.fsrs), today);
  }
  await insertPracticeEvent(supabase, childId, {
    kind: "question_attempted",
    skillId: question.skill_id,
    detail: { correct: correct ? 1 : 0 },
  });
  if (mark.showedHow) {
    await insertPracticeEvent(supabase, childId, {
      kind: "hint_rung",
      skillId: question.skill_id,
      detail: { rung: "show-how" },
    });
  }
  const seconds = Number(formData.get("elapsedSeconds"));
  if (Number.isInteger(seconds) && seconds >= 0 && seconds <= 7200) {
    await insertPracticeEvent(supabase, childId, {
      kind: "time_on_task",
      skillId: question.skill_id,
      detail: { seconds },
    });
  }

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
    feedbackFor: issued.question.questionId,
    note,
    saveNote: "saved",
    next: issued.question,
  });
}

type ClientAttemptRow = {
  learning_applied: boolean;
  skill_id: string;
  correct: boolean;
};

async function readClientAttempt(
  supabase: SupabaseClient,
  childId: string,
  attemptId: string,
): Promise<{ row: ClientAttemptRow | null; error: string | null }> {
  if (!isAttemptId(attemptId)) return { row: null, error: null };
  const { data, error } = await supabase
    .from("attempts")
    .select("learning_applied, skill_id, correct")
    .eq("child_id", childId)
    .eq("client_attempt_id", attemptId)
    .maybeSingle();
  if (error) return { row: null, error: friendlyDbError(error) };
  return { row: (data as ClientAttemptRow | null) ?? null, error: null };
}

async function applyStoredAttempt(
  supabase: SupabaseClient,
  childId: string,
  attemptId: string,
): Promise<{ error: string | null; counted: boolean }> {
  return runClaimedLearning({
    supabase,
    childId,
    attemptId,
    apply: async (row) => {
      const { cards, error } = await loadCards(supabase, childId);
      if (error) return error;
      const today = torontoDate();
      const applied = applyLearning({
        card: cardFor(cards, row.skill_id),
        correct: row.correct,
        kind: "focus",
        today,
      });
      return persistCards(supabase, childId, applied.card, applied.extra ?? null);
    },
  });
}

async function continueAfterSave(
  supabase: SupabaseClient,
  childId: string,
  access: GradeAccess,
  counted = true,
): Promise<PracticeState> {
  const { cards, error } = await loadCards(supabase, childId);
  if (error) return { error };
  const issued = await loadOrIssueQuestion(supabase, childId, access.working, cards);
  if (!issued.question) return { error: issued.error ?? "Could not load the next question." };
  return snapshot(supabase, childId, access, cards, {
    feedbackFor: issued.question.questionId,
    ...(counted ? { saveNote: "saved" as const } : {}),
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
  if (isLessonSkill(skillId) && skill.grade === access.working) {
    redirect(`/practice/${childId}/lesson/${skillId}`);
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

export type StartState = { error?: string; note?: string };

/** Opens a skill from the student home, then leaves the lists for the question. */
export async function startSkill(_previous: StartState, formData: FormData): Promise<StartState> {
  const childId = String(formData.get("childId") ?? "");
  const skillId = String(formData.get("skillId") ?? "");
  if (childId && isLessonSkill(skillId)) {
    const owned = await ownedChild(childId);
    const skill = skillById(skillId);
    if (!("error" in owned) && skill && skill.grade === owned.access.working) {
      redirect(`/practice/${childId}/lesson/${skillId}`);
    }
  }
  const result = await chooseSkill({}, formData);
  if (result.requestNote && !result.next) return { note: result.requestNote };
  if (result.error && !result.next) return { error: result.error };
  if (!childId) return { error: "Choose a skill to practice." };
  redirect(`/practice/${childId}`);
}

export async function logPracticeEvent(
  childId: string,
  kind: string,
  skillId: string,
  detail: Record<string, string | number>,
): Promise<void> {
  const event = buildPracticeEvent({ kind, skillId, detail });
  if (!event || !childId) return;
  const owned = await ownedChild(childId);
  if ("error" in owned) return;
  await insertPracticeEvent(owned.supabase, childId, event);
}

async function insertPracticeEvent(
  supabase: SupabaseClient,
  childId: string,
  event: PracticeEvent,
): Promise<void> {
  const { error } = await supabase.from("practice_events").insert({
    child_id: childId,
    kind: event.kind,
    skill_id: event.skillId,
    detail: event.detail,
  });
  if (error) return;
}

function introCycleFrom(formData: FormData, skillId: string): IntroCycle | null {
  if (String(formData.get("introSkillId") ?? "") !== skillId) return null;
  const cycle = String(formData.get("introCycle") ?? "");
  if (cycle === "new" || cycle === "relearn" || cycle === "rollback") return cycle;
  return null;
}

type IntroStateRow = {
  attempted: number;
  correct: number;
  streak: number;
  fsrs: unknown;
  updated_at: string;
};

/**
 * Records that the intro timer finished. A failed save must not trap the student on the intro.
 * The write retries when another save changes the row, so an answer is not overwritten.
 */
export async function markIntroSeen(childId: string, skillId: string, cycle: string): Promise<void> {
  if (cycle !== "new" && cycle !== "relearn" && cycle !== "rollback") return;
  if (!childId || !skillId) return;
  const owned = await ownedChild(childId);
  if ("error" in owned) return;
  if (!skillById(skillId)) return;
  await stampIntro(owned.supabase, childId, skillId, cycle, torontoDate());
}

async function stampIntro(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
  cycle: IntroCycle,
  today: string,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from("skill_states")
      .select("attempted, correct, streak:consecutive_correct, fsrs, updated_at")
      .eq("child_id", childId)
      .eq("skill_id", skillId)
      .maybeSingle();
    if (error) return;

    const row = data as IntroStateRow | null;
    const card = row
      ? {
          skillId,
          attempted: row.attempted,
          correct: row.correct,
          streak: row.streak,
          fsrs: row.fsrs,
        }
      : emptyCard(skillId);
    const fsrs = writeLearn(card.fsrs, {
      ...readLearn(card.fsrs),
      introSeenAt: today,
      introCycle: cycle,
    });

    if (!row) {
      const inserted = await supabase
        .from("skill_states")
        .insert({
          child_id: childId,
          skill_id: skillId,
          attempted: 0,
          correct: 0,
          consecutive_correct: 0,
          fsrs,
          updated_at: new Date().toISOString(),
        })
        .select("skill_id");
      if (!inserted.error) return;
      continue;
    }

    const updated = await supabase
      .from("skill_states")
      .update({ fsrs, updated_at: new Date().toISOString() })
      .eq("child_id", childId)
      .eq("skill_id", skillId)
      .eq("updated_at", row.updated_at)
      .select("skill_id");
    if (!updated.error && updated.data && updated.data.length > 0) return;
  }
}

export async function practiceAction(
  previous: PracticeState,
  formData: FormData,
): Promise<PracticeState> {
  const intent = String(formData.get("intent") ?? "answer");
  if (intent === "choose") return chooseSkill(previous, formData);
  return submitAnswer(previous, formData);
}
