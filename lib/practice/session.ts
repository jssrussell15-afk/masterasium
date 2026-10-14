import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/db-error";
import { torontoDate } from "@/lib/digest/build";
import type { SupportedGrade } from "@/lib/grades";
import { assistFor } from "@/lib/practice/assist";
import { planNextQuestion } from "@/lib/practice/learning";
import { answerShape } from "@/lib/practice/parts";
import type { AttemptPoint } from "@/lib/practice/portrait";
import { getItemSource } from "@/lib/practice/source";
import { packStoredAnswer, readStoredPlan, unpackStoredAnswer } from "@/lib/practice/stored-answer";
import {
  accuracyScheduler,
  emptyCard,
  type SkillCard,
} from "@/lib/practice/scheduler";
import { skillById, type Skill } from "@/lib/practice/skills";
import type { QuestionKind, QuestionView } from "@/lib/practice/types";

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
    .select("skill_id, attempted, correct, streak, fsrs")
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
  firstStep: string | null,
  kind: QuestionKind,
  cards: SkillCard[],
): QuestionView {
  const shape = answerShape(prompt, expected);
  return {
    questionId,
    prompt,
    skillId: skill.id,
    skillTitle: skill.title,
    responseHint: shape.kind === "single" ? skill.responseHint : null,
    kind,
    shape,
    assist: assistFor({
      attempted: cardFor(cards, skill.id).attempted,
      summary: skill.summary,
      firstStep,
      expected,
      kind,
    }),
  };
}

function kindFor(skill: Skill, grade: SupportedGrade, cards: SkillCard[]): QuestionKind {
  const today = torontoDate();
  const focus = accuracyScheduler.chooseSkill({ grade, cards, sessionCount: 0, today });
  return skill.id === focus.id ? "focus" : "review";
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
  const plan = planNextQuestion({
    grade,
    cards,
    sessionCount,
    today,
    requestedSkillId: options?.skillId,
    explicit: options?.explicit,
    coachSmall: Boolean(options?.small) && !options?.explicit,
  });
  const skill = skillById(plan.skillId);
  if (!skill || skill.grade !== grade) {
    return { question: null, error: "That skill is not in this grade." };
  }

  const removed = await supabase.from("pending_questions").delete().eq("child_id", childId);
  if (removed.error) return { question: null, error: friendlyDbError(removed.error) };

  const generated = getItemSource("generated").next(skill, Math.random, { small: plan.small });

  const { data, error } = await supabase
    .from("pending_questions")
    .insert({
      child_id: childId,
      skill_id: skill.id,
      prompt: generated.prompt,
      answer: packStoredAnswer(generated.answer, generated.steps, {
        kind: plan.kind,
        rollbackSkillId: plan.rollbackSkillId,
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
      generated.steps[0] ?? null,
      plan.kind,
      cards,
    ),
    error: null,
  };
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
  if (existing && skill && skill.grade === grade) {
    const unpacked = unpackStoredAnswer(existing.answer);
    const plan = readStoredPlan(existing.answer);
    return {
      question: presentQuestion(
        existing.id,
        skill,
        existing.prompt,
        unpacked.answer,
        unpacked.steps[0] ?? null,
        plan.kind ?? kindFor(skill, grade, cards),
        cards,
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
