import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/db-error";
import type { SupportedGrade } from "@/lib/grades";
import { getItemSource } from "@/lib/practice/source";
import { packStoredAnswer } from "@/lib/practice/stored-answer";
import {
  accuracyScheduler,
  emptyCard,
  type SkillCard,
} from "@/lib/practice/scheduler";
import { skillById, type Skill } from "@/lib/practice/skills";
import type { QuestionView } from "@/lib/practice/types";

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
};

export type IssueOptions = {
  /** Skip the scheduler and ask this skill. Any skill in the grade is allowed. */
  skillId?: string;
  /** A shorter question after the same kind of mistake. */
  small?: boolean;
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

function toView(row: PendingRow, skill: Skill, kind: QuestionView["kind"]): QuestionView {
  return {
    questionId: row.id,
    prompt: row.prompt,
    skillId: skill.id,
    skillTitle: skill.title,
    responseHint: skill.responseHint,
    kind,
  };
}

function kindFor(skill: Skill, grade: SupportedGrade, cards: SkillCard[]): QuestionView["kind"] {
  const focus = accuracyScheduler.chooseSkill({ grade, cards, sessionCount: 0 });
  return skill.id === focus.id ? "focus" : "review";
}

export async function issueQuestion(
  supabase: SupabaseClient,
  childId: string,
  grade: SupportedGrade,
  cards: SkillCard[],
  options?: IssueOptions,
): Promise<{ question: QuestionView | null; error: string | null }> {
  let skill: Skill;
  let kind: QuestionView["kind"];
  if (options?.skillId) {
    const chosen = skillById(options.skillId);
    if (!chosen || chosen.grade !== grade) {
      return { question: null, error: "That skill is not in this grade." };
    }
    skill = chosen;
    kind = "focus";
  } else {
    const sessionCount = cards.reduce((total, card) => total + card.attempted, 0);
    skill = accuracyScheduler.chooseSkill({ grade, cards, sessionCount });
    kind = kindFor(skill, grade, cards);
  }

  const removed = await supabase.from("pending_questions").delete().eq("child_id", childId);
  if (removed.error) return { question: null, error: friendlyDbError(removed.error) };

  const generated = getItemSource("generated").next(skill, Math.random, {
    small: options?.small ?? false,
  });

  const { data, error } = await supabase
    .from("pending_questions")
    .insert({
      child_id: childId,
      skill_id: skill.id,
      prompt: generated.prompt,
      answer: packStoredAnswer(generated.answer, generated.steps),
    })
    .select("id, skill_id, prompt")
    .single();

  if (error || !data) {
    return {
      question: null,
      error: error ? friendlyDbError(error) : "Could not start a question.",
    };
  }

  return {
    question: toView(data as PendingRow, skill, kind),
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
    .select("id, skill_id, prompt")
    .eq("child_id", childId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { question: null, error: friendlyDbError(error) };

  const existing = data as PendingRow | null;
  const skill = existing ? skillById(existing.skill_id) : undefined;
  if (existing && skill && skill.grade === grade) {
    return {
      question: toView(existing, skill, kindFor(skill, grade, cards)),
      error: null,
    };
  }

  return issueQuestion(supabase, childId, grade, cards);
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
