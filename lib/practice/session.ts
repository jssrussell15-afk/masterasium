import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/db-error";
import { torontoDate } from "@/lib/digest/build";
import type { SupportedGrade } from "@/lib/grades";
import { assistFor } from "@/lib/practice/assist";
import { buildWorkedExample } from "@/lib/practice/example";
import { whyLine, type AttemptMark } from "@/lib/practice/feedback";
import { hintLadder } from "@/lib/practice/hints";
import { buildSkillIntro, introCycleDue, nearTransfer } from "@/lib/practice/intro";
import type { SkillIntro } from "@/lib/practice/intro-view";
import { planNextQuestion } from "@/lib/practice/learning";
import { onRampCopy } from "@/lib/practice/review";
import { readLearn } from "@/lib/practice/memory";
import { answerShape } from "@/lib/practice/parts";
import type { AttemptPoint } from "@/lib/practice/portrait";
import { getItemSource } from "@/lib/practice/source";
import { packStoredAnswer, readAttemptMark, readStoredPlan, unpackStoredAnswer } from "@/lib/practice/stored-answer";
import {
  accuracyScheduler,
  emptyCard,
  type SkillCard,
} from "@/lib/practice/scheduler";
import { loadPlacement } from "@/lib/practice/placement-store";
import { practiceAnchor } from "@/lib/practice/placement";
import { skillById, type Skill } from "@/lib/practice/skills";
import type { Question, QuestionKind, QuestionView } from "@/lib/practice/types";

type SkillStateRow = {
  skill_id: string;
  attempted: number;
  correct: number;
  streak: number;
  fsrs: unknown;
};

type PendingRow = {
  id: string;
  skill_id: string;
  prompt: string;
  answer: string;
};

export type IssueOptions = {
  /** Skip the scheduler and ask this skill. Any skill in the grade is allowed. */
  skillId?: string;
  /** A shorter question after the same kind of mistake. Ignored when the learner chose the topic. */
  small?: boolean;
  /** The learner or parent picked this skill. Do not replace it with a check or a rollback. */
  explicit?: boolean;
};

export async function loadCards(
  supabase: SupabaseClient,
  childId: string,
): Promise<{ cards: SkillCard[]; error: string | null }> {
  const { data, error } = await supabase
    .from("skill_states")
    .select("skill_id, attempted, correct, streak:consecutive_correct, fsrs")
    .eq("child_id", childId);

  if (error) return { cards: [], error: friendlyDbError(error) };

  const rows = (data ?? []) as SkillStateRow[];
  return {
    cards: rows.map((row) => ({
      skillId: row.skill_id,
      attempted: row.attempted,
      correct: row.correct,
      streak: row.streak,
      fsrs: row.fsrs ?? null,
    })),
    error: null,
  };
}

function presentQuestion(
  questionId: string,
  skill: Skill,
  prompt: string,
  expected: string,
  steps: string[],
  kind: QuestionKind,
  cards: SkillCard[],
  intro: SkillIntro | null,
  mark: AttemptMark | null,
  onRamp = false,
): QuestionView {
  const shape = answerShape(prompt, expected);
  const assist = assistFor({
    attempted: cardFor(cards, skill.id).attempted,
    summary: skill.summary,
    firstStep: steps[0] ?? null,
    expected,
    kind,
  });
  const example = buildWorkedExample({
    skillId: skill.id,
    livePrompt: prompt,
    small: kind === "support",
  });
  return {
    questionId,
    prompt,
    skillId: skill.id,
    skillTitle: skill.title,
    responseHint: shape.kind === "single" ? skill.responseHint : null,
    kind,
    shape,
    assist,
    hints: hintLadder({
      summary: skill.summary,
      firstStep: assist?.firstStep ?? steps[0] ?? null,
      examplePrompt: skill.examplePrompt,
      exampleAnswer: skill.exampleAnswer,
      expected,
      prompt,
    }),
    example,
    ...(onRamp ? { onRamp: onRampCopy(example?.steps[0] ?? skill.exampleSteps[0]) } : {}),
    ...(mark
      ? {
          resume: {
            phase: mark.phase,
            why: mark.phase === "correct" ? whyLine(steps) : null,
            steps: mark.phase === "revealed" ? steps : [],
            expected: mark.phase === "revealed" ? expected : null,
            draft: mark.given,
          },
        }
      : {}),
    ...(intro ? { intro } : {}),
  };
}

function kindFor(
  skill: Skill,
  grade: SupportedGrade,
  cards: SkillCard[],
  startSkillId?: string,
): QuestionKind {
  const today = torontoDate();
  const focus = accuracyScheduler.chooseSkill({ grade, cards, sessionCount: 0, today, startSkillId });
  return skill.id === focus.id ? "focus" : "review";
}

async function lastAttemptDate(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("attempts")
    .select("created_at")
    .eq("child_id", childId)
    .eq("skill_id", skillId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.created_at) return null;
  const created = new Date(data.created_at);
  if (Number.isNaN(created.getTime())) return null;
  return torontoDate(created);
}

async function introForIssued(
  supabase: SupabaseClient,
  childId: string,
  skill: Skill,
  cards: SkillCard[],
  plan: { kind: QuestionKind; rollbackSkillId?: string | null },
  today: string,
): Promise<SkillIntro | null> {
  const card = cards.find((item) => item.skillId === skill.id);
  const parentId = plan.kind === "support" ? plan.rollbackSkillId || skill.id : skill.id;
  const cycle = introCycleDue({
    attempted: card?.attempted ?? 0,
    learn: readLearn(card?.fsrs),
    today,
    lastAttempt: await lastAttemptDate(supabase, childId, skill.id),
    kind: plan.kind,
    supportLeft:
      plan.kind === "support" ? readLearn(cardFor(cards, parentId).fsrs).supportLeft : undefined,
  });
  return cycle ? buildSkillIntro(skill, cycle) : null;
}

async function persistQuestion(
  supabase: SupabaseClient,
  childId: string,
  skill: Skill,
  cards: SkillCard[],
  plan: { kind: QuestionKind; small: boolean; rollbackSkillId?: string; onRamp?: boolean },
  intro: SkillIntro | null,
): Promise<{ question: QuestionView | null; error: string | null }> {
  const removed = await supabase.from("pending_questions").delete().eq("child_id", childId);
  if (removed.error) return { question: null, error: friendlyDbError(removed.error) };

  const generated: Question = intro
    ? nearTransfer(skill, Math.random, { small: plan.small })
    : getItemSource("generated").next(skill, Math.random, { small: plan.small });

  const { data, error } = await supabase
    .from("pending_questions")
    .insert({
      child_id: childId,
      skill_id: skill.id,
      prompt: generated.prompt,
      answer: packStoredAnswer(generated.answer, generated.steps, {
        kind: plan.kind,
        rollbackSkillId: plan.rollbackSkillId,
        onRamp: plan.onRamp === true,
      }),
    })
    .select("id, skill_id, prompt, answer")
    .single();

  if (error || !data) {
    return {
      question: null,
      error: error ? friendlyDbError(error) : "Could not start a question.",
    };
  }

  const row = data as PendingRow;
  return {
    question: presentQuestion(
      row.id,
      skill,
      generated.prompt,
      generated.answer,
      generated.steps,
      plan.kind,
      cards,
      intro,
      null,
      plan.onRamp === true,
    ),
    error: null,
  };
}

export async function issueQuestion(
  supabase: SupabaseClient,
  childId: string,
  grade: SupportedGrade,
  cards: SkillCard[],
  options?: IssueOptions,
): Promise<{ question: QuestionView | null; error: string | null }> {
  const sessionCount = cards.reduce((total, card) => total + card.attempted, 0);
  const today = torontoDate();
  const loaded = options?.explicit ? null : await loadPlacement(supabase, childId);
  const anchor = practiceAnchor(loaded?.placement ?? null, grade);
  const plan = planNextQuestion({
    grade,
    cards,
    sessionCount,
    today,
    requestedSkillId: options?.skillId,
    explicit: options?.explicit,
    coachSmall: Boolean(options?.small) && !options?.explicit,
    startSkillId: anchor.startSkillId,
    mixSkillId: anchor.mixSkillId,
  });
  const skill = skillById(plan.skillId);
  if (!skill || skill.grade !== grade) {
    return { question: null, error: "That skill is not in this grade." };
  }

  const intro = await introForIssued(supabase, childId, skill, cards, plan, today);
  return persistQuestion(supabase, childId, skill, cards, plan, intro);
}

export async function loadOrIssueQuestion(
  supabase: SupabaseClient,
  childId: string,
  grade: SupportedGrade,
  cards: SkillCard[],
): Promise<{ question: QuestionView | null; error: string | null }> {
  const { data, error } = await supabase
    .from("pending_questions")
    .select("id, skill_id, prompt, answer")
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { question: null, error: friendlyDbError(error) };

  const existing = data as PendingRow | null;
  const skill = existing ? skillById(existing.skill_id) : undefined;
  const loaded = await loadPlacement(supabase, childId);
  const anchor = practiceAnchor(loaded.placement, grade);
  if (existing && skill && skill.grade === grade) {
    const unpacked = unpackStoredAnswer(existing.answer);
    const stored = readStoredPlan(existing.answer);
    const kind = stored.kind ?? kindFor(skill, grade, cards, anchor.startSkillId);
    const today = torontoDate();
    const intro = await introForIssued(
      supabase,
      childId,
      skill,
      cards,
      { kind, rollbackSkillId: stored.rollbackSkillId },
      today,
    );
    if (intro && !readAttemptMark(existing.answer)) {
      return persistQuestion(
        supabase,
        childId,
        skill,
        cards,
        {
          kind,
          small: kind === "support",
          ...(stored.rollbackSkillId ? { rollbackSkillId: stored.rollbackSkillId } : {}),
          ...(stored.onRamp ? { onRamp: true } : {}),
        },
        intro,
      );
    }
    return {
      question: presentQuestion(
        existing.id,
        skill,
        existing.prompt,
        unpacked.answer,
        unpacked.steps,
        kind,
        cards,
        null,
        readAttemptMark(existing.answer),
        stored.onRamp,
      ),
      error: null,
    };
  }

  return issueQuestion(supabase, childId, grade, cards);
}

type AttemptLogRow = {
  skill_id: string;
  correct: boolean;
  created_at: string;
};

export async function loadAttemptLog(
  supabase: SupabaseClient,
  childId: string,
): Promise<{ attempts: AttemptPoint[]; error: string | null }> {
  const { data, error } = await supabase
    .from("attempts")
    .select("skill_id, correct, created_at")
    .eq("child_id", childId);

  if (error) return { attempts: [], error: friendlyDbError(error) };

  const rows = (data ?? []) as AttemptLogRow[];
  return {
    attempts: rows.map((row) => ({
      skillId: row.skill_id,
      correct: Boolean(row.correct),
      date: torontoDate(new Date(row.created_at)),
      at: row.created_at,
    })),
    error: null,
  };
}

export function cardFor(cards: SkillCard[], skillId: string): SkillCard {
  return cards.find((card) => card.skillId === skillId) ?? emptyCard(skillId);
}

export function totals(cards: SkillCard[]): { attempted: number; correct: number } {
  return cards.reduce(
    (sum, card) => ({
      attempted: sum.attempted + card.attempted,
      correct: sum.correct + card.correct,
    }),
    { attempted: 0, correct: 0 },
  );
}
