import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError } from "@/lib/db-error";
import { torontoDate } from "@/lib/digest/build";
import type { SupportedGrade } from "@/lib/grades";
import { assistFor } from "@/lib/practice/assist";
import { applyShowGap, resolvedShowLevel } from "@/lib/practice/fade";
import { buildWorkedExample } from "@/lib/practice/example";
import { alignExamplesWithChoices } from "@/lib/practice/example-choices";
import { workedExamplePool } from "@/lib/practice/example-pool";
import { whyLine, type AttemptMark } from "@/lib/practice/feedback";
import { firstSafeStep, hintLadder } from "@/lib/practice/hints";
import { buildSkillIntro, introCycleDue, nearTransfer } from "@/lib/practice/intro";
import type { SkillIntro } from "@/lib/practice/intro-view";
import { planNextQuestion } from "@/lib/practice/learning";
import { onRampCopy } from "@/lib/practice/review";
import { readLearn, writeLearn } from "@/lib/practice/memory";
import { answerShape } from "@/lib/practice/parts";
import type { AttemptPoint } from "@/lib/practice/portrait";
import { getItemSource } from "@/lib/practice/source";
import { packStoredAnswer, readAttemptMark, readStoredInput, readStoredPlan, readStoredWalk, unpackStoredAnswer } from "@/lib/practice/stored-answer";
import { workedExampleQuestion } from "@/lib/practice/generate";
import { resolveInput } from "@/lib/practice/input-type";
import { validateQuestion } from "@/lib/practice/validate-question";
import { skillCanWalk, walkForSkill, type Walkthrough } from "@/lib/practice/walk";
import {
  accuracyScheduler,
  emptyCard,
  type SkillCard,
} from "@/lib/practice/scheduler";
import { loadPlacement } from "@/lib/practice/placement-store";
import { practiceAnchor } from "@/lib/practice/placement";
import { skillById, type Skill } from "@/lib/practice/skills";
import type { InputType, Question, QuestionKind, QuestionView } from "@/lib/practice/types";

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
  walk: Walkthrough | null,
  onRamp = false,
  delivery?: { inputType?: InputType | null; choices?: string[] | null; speak?: string | null },
): QuestionView {
  const shape = answerShape(prompt, expected);
  const resolved = delivery?.inputType
    ? {
        inputType: delivery.inputType,
        choices: delivery.inputType === "choice" ? (delivery.choices ?? null) : null,
      }
    : resolveInput({
        grade: skill.grade,
        prompt,
        answer: expected,
        seed: questionId,
      });
  const showLevel = resolvedShowLevel(readLearn(cardFor(cards, skill.id).fsrs).showLevel, skillCanWalk(skill.id));
  const assistPlan = assistFor({
    attempted: cardFor(cards, skill.id).attempted,
    summary: skill.summary,
    firstStep: steps[0] ?? null,
    expected,
    kind,
  });
  const assist = showLevel === 4 ? null : assistPlan;
  const examples = workedExamplePool({
    skillId: skill.id,
    livePrompt: prompt,
    liveAnswer: expected,
  });
  const aligned = alignExamplesWithChoices({
    pool: examples,
    choices: resolved.choices,
    grade: skill.grade,
    prompt,
    answer: expected,
    seed: questionId,
  });
  const example =
    aligned.examples[0] ??
    buildWorkedExample({
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
    examples: aligned.examples.length >= 2 ? aligned.examples : null,
    helpSteps: steps,
    walk: clientWalk(walk, expected, mark),
    showLevel,
    walkMode: mark?.walkMode ?? null,
    inputType: resolved.inputType,
    choices: aligned.choices,
    ...(delivery?.speak ? { speak: delivery.speak } : {}),
    ...(onRamp ? { onRamp: onRampCopy(firstSafeStep(steps, expected)) } : {}),
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
  built?: Question,
  avoidPrompt?: string,
): Promise<{ question: QuestionView | null; error: string | null }> {
  const today = torontoDate();
  const readyCards = await refreshShowGap(supabase, childId, skill.id, cards, today);
  const removed = await supabase.from("pending_questions").delete().eq("child_id", childId);
  if (removed.error) return { question: null, error: friendlyDbError(removed.error) };

  const generated = vettedQuestion(skill, {
    small: plan.small,
    intro: Boolean(intro) && !built,
    ...(built ? { first: built } : {}),
    ...(avoidPrompt ? { avoidPrompt } : {}),
  });

  const { data, error } = await supabase
    .from("pending_questions")
    .insert({
      child_id: childId,
      skill_id: skill.id,
      prompt: generated.prompt,
      answer: packStoredAnswer(generated.answer, generated.steps, {
        kind: plan.kind,
        rollbackSkillId: plan.rollbackSkillId,
        walk: generated.walk ?? null,
        onRamp: plan.onRamp === true,
        inputType: generated.inputType,
        choices: generated.choices,
        speak: generated.speak,
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
      readyCards,
      intro,
      null,
      generated.walk ?? null,
      plan.onRamp === true,
      {
        inputType: generated.inputType ?? null,
        choices: generated.choices ?? null,
        speak: generated.speak ?? null,
      },
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

/** A new question of the same skill, with different numbers. It is a fresh first try. */
export async function issueFollowUp(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
  cards: SkillCard[],
  avoidPrompt: string,
  plan: { kind: QuestionKind; small: boolean; rollbackSkillId?: string },
): Promise<{ question: QuestionView | null; error: string | null }> {
  const skill = skillById(skillId);
  if (!skill) return { question: null, error: "That skill is not available." };
  return persistQuestion(supabase, childId, skill, cards, plan, null, undefined, avoidPrompt);
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
    const readyCards = await refreshShowGap(supabase, childId, skill.id, cards, today);
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
        readyCards,
        null,
        readAttemptMark(existing.answer),
        readStoredWalk(existing.answer) ?? walkForSkill(skill.id, existing.prompt, unpacked.answer),
        stored.onRamp,
        readStoredInput(existing.answer),
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

/** The answer stays on the server until Show me or a second miss. */
function clientWalk(walk: Walkthrough | null, expected: string, mark: AttemptMark | null): Walkthrough | null {
  if (!walk) return null;
  return {
    steps: walk.steps,
    answer: mark?.phase === "revealed" ? expected : "",
  };
}

/**
 * A long gap steps Show me up once, on the day the skill appears.
 * A failed save leaves the previous level in place.
 */
export async function refreshShowGap(
  supabase: SupabaseClient,
  childId: string,
  skillId: string,
  cards: SkillCard[],
  today: string,
): Promise<SkillCard[]> {
  const stored = cards.find((card) => card.skillId === skillId);
  if (!stored) return cards;
  const before = readLearn(stored.fsrs);
  const after = applyShowGap(before, {
    lastDay: await lastAttemptDate(supabase, childId, skillId),
    today,
    hasWalk: skillCanWalk(skillId),
  });
  if (before.showLevel === after.showLevel && before.showGapOn === after.showGapOn) return cards;
  const next = { ...stored, fsrs: writeLearn(stored.fsrs, after) };
  const { error } = await supabase
    .from("skill_states")
    .update({ fsrs: next.fsrs, updated_at: new Date().toISOString() })
    .eq("child_id", childId)
    .eq("skill_id", skillId);
  if (error) return cards;
  return cards.map((card) => (card.skillId === skillId ? next : card));
}

const VET_LIMIT = 8;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function withResolvedInput(skill: Skill, question: Question, seed: string): Question {
  const resolved = resolveInput({
    grade: skill.grade,
    prompt: question.prompt,
    answer: question.answer,
    declared: question.inputType,
    choices: question.choices,
    seed,
  });
  return {
    ...question,
    inputType: resolved.inputType,
    choices: resolved.choices,
    speak: question.speak ?? null,
  };
}

function vettedQuestion(
  skill: Skill,
  options: { small: boolean; intro: boolean; avoidPrompt?: string; first?: Question },
): Question {
  const seed = Math.floor(Math.random() * 0x7fffffff) || 1;
  for (let attempt = 0; attempt < VET_LIMIT; attempt += 1) {
    const generated =
      attempt === 0 && options.first
        ? options.first
        : options.intro
          ? nearTransfer(skill, mulberry32(seed + attempt * 997), { small: options.small })
          : getItemSource("generated").next(skill, mulberry32(seed + attempt * 997), { small: options.small });
    if (options.avoidPrompt && generated.prompt === options.avoidPrompt) continue;
    const ready = withResolvedInput(skill, generated, `${skill.id}:${seed + attempt}:${generated.prompt}`);
    const verdict = validateQuestion(ready);
    if (verdict.ok) return verdict.question;
  }
  const example = withResolvedInput(skill, workedExampleQuestion(skill.id), `${skill.id}:example`);
  const verdict = validateQuestion(example);
  return verdict.ok ? verdict.question : example;
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
