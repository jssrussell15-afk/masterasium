import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/practice/dates";
import { applyLearning, planNextQuestion } from "@/lib/practice/learning";
import { readLearn, writeLearn, type LearnState } from "@/lib/practice/memory";
import { RECALL_INTERVALS, reviewQuestionsInSet } from "@/lib/practice/review";
import type { SkillCard } from "@/lib/practice/scheduler";

const today = "2026-10-18";

function confirmed(skillId: string, learn: LearnState, correct = 10): SkillCard {
  return {
    skillId,
    attempted: 10,
    correct,
    streak: 4,
    fsrs: writeLearn(null, { lessonCheck: "passed", ...learn }),
  };
}

function dueToday(card: SkillCard): SkillCard {
  const learn = { ...readLearn(card.fsrs), reviewDueAt: today };
  return { ...card, fsrs: writeLearn(card.fsrs, learn) };
}

describe("recall intervals", () => {
  it("steps 1, 3, 7, 14, then 30, and stays at 30", () => {
    let card = confirmed("g3-fractions", { recallStep: 0, reviewDueAt: today });
    const expected = [
      { step: 1, days: 3, mark: "day" },
      { step: 2, days: 7, mark: undefined },
      { step: 3, days: 14, mark: "week" },
      { step: 4, days: 30, mark: undefined },
      { step: 4, days: 30, mark: "month" },
      { step: 4, days: 30, mark: "month" },
    ] as const;

    expected.forEach((next) => {
      card = dueToday(card);
      card = applyLearning({ card, correct: true, kind: "review", today }).card;
      const learn = readLearn(card.fsrs);
      expect(learn.recallStep).toBe(next.step);
      expect(learn.reviewDueAt).toBe(addDays(today, next.days));
      expect(learn.recallMark).toBe(next.mark);
      expect(learn.needsReview).toBeUndefined();
    });

    expect(RECALL_INTERVALS).toEqual([1, 3, 7, 14, 30]);
  });

  it("schedules 1 day when the step is still absent", () => {
    const card = confirmed("g3-time", { reviewDueAt: today });
    const next = applyLearning({ card, correct: true, kind: "review", today }).card;
    const learn = readLearn(next.fsrs);
    expect(learn.recallStep).toBe(0);
    expect(learn.reviewDueAt).toBe(addDays(today, 1));
    expect(learn.recallMark).toBeUndefined();
    expect(learn.recallFreshOn).toBe(today);
  });

  it("steps back one interval on a miss, and back to 1 day after two misses", () => {
    const atThirty = confirmed("g3-fractions", { recallStep: 4, reviewDueAt: today, missStreak: 2 });
    const once = applyLearning({ card: atThirty, correct: false, kind: "review", today }).card;
    expect(readLearn(once.fsrs).recallStep).toBe(3);
    expect(readLearn(once.fsrs).needsReview).toBe(true);
    expect(readLearn(once.fsrs).recallMisses).toBe(1);
    expect(readLearn(once.fsrs).missStreak).toBe(2);
    expect(readLearn(once.fsrs).supportLeft).toBeUndefined();
    expect(readLearn(once.fsrs).lessonCheck).toBe("passed");
    expect(once.streak).toBe(0);
    expect(once.attempted).toBe(11);

    const twice = applyLearning({ card: once, correct: false, kind: "review", today }).card;
    expect(readLearn(twice.fsrs).recallStep).toBe(0);
    expect(readLearn(twice.fsrs).recallMisses).toBe(2);
    expect(readLearn(twice.fsrs).needsReview).toBe(true);
    expect(readLearn(twice.fsrs).supportLeft).toBeUndefined();
    expect(readLearn(twice.fsrs).missStreak).toBe(2);

    const repaired = applyLearning({ card: once, correct: true, kind: "review", today }).card;
    expect(readLearn(repaired.fsrs).needsReview).toBeUndefined();
    expect(readLearn(repaired.fsrs).recallStep).toBe(3);
    expect(readLearn(repaired.fsrs).reviewDueAt).toBe(addDays(today, 14));
    expect(readLearn(repaired.fsrs).recallMark).toBeUndefined();
    expect(readLearn(repaired.fsrs).recallFreshOn).toBe(today);
  });

  it("does not climb when Show me an example was opened", () => {
    const card = confirmed("g3-time", { recallStep: 2, reviewDueAt: today });
    const next = applyLearning({
      card,
      correct: true,
      kind: "review",
      today,
      showedExample: true,
    }).card;
    expect(readLearn(next.fsrs).recallStep).toBe(2);
    expect(readLearn(next.fsrs).reviewDueAt).toBe(today);
    expect(readLearn(next.fsrs).recallFreshOn).toBeUndefined();
  });

  it("keeps recallStep 0 in the stored learn object", () => {
    const stored = writeLearn(null, { recallStep: 0, lessonCheck: "passed" });
    expect(readLearn(stored).recallStep).toBe(0);
  });
});

describe("review slots", () => {
  const due = [
    confirmed("g1-count", { reviewDueAt: "2026-10-01", recallStep: 0 }, 8),
    confirmed("g1-add-10", { reviewDueAt: today, recallStep: 1 }, 9),
    confirmed("g1-sub-10", { reviewDueAt: today, recallStep: 1 }, 10),
  ];

  it("caps a 10-question session at slots 3, 6, and 9", () => {
    expect(reviewQuestionsInSet(0, 10)).toEqual([3, 6, 9]);
    const plans = Array.from({ length: 10 }, (_, sessionCount) =>
      planNextQuestion({ grade: 1, cards: due, sessionCount, today }),
    );
    const reviews = plans.filter((plan) => plan.kind === "review");
    expect(reviews).toHaveLength(3);
    expect(plans.map((plan) => plan.kind)).toEqual([
      "focus",
      "focus",
      "review",
      "focus",
      "focus",
      "review",
      "focus",
      "focus",
      "review",
      "focus",
    ]);
    expect(reviews.map((plan) => plan.skillId)).toEqual(["g1-count", "g1-add-10", "g1-sub-10"]);
    expect(new Set(reviews.map((plan) => plan.skillId)).size).toBe(3);
  });

  it("weaves nothing when no skill is due", () => {
    const later = due.map((card) => confirmed(card.skillId, { reviewDueAt: "2026-12-01", recallStep: 2 }));
    const plans = Array.from({ length: 10 }, (_, sessionCount) =>
      planNextQuestion({ grade: 1, cards: later, sessionCount, today }),
    );
    expect(plans.every((plan) => plan.kind === "focus")).toBe(true);
    expect(plans.every((plan) => plan.skillId === "g1-compare")).toBe(true);
  });

  it("uses one review per four questions in a shorter sitting", () => {
    expect(reviewQuestionsInSet(0, 4)).toEqual([3]);
    expect(reviewQuestionsInSet(0, 6)).toEqual([3]);
    expect(reviewQuestionsInSet(0, 8)).toEqual([3, 6]);
    expect(reviewQuestionsInSet(0, 2)).toEqual([]);
  });

  it("keeps a focus mix and moves the review to the next open slot", () => {
    expect(reviewQuestionsInSet(10, 10)).toEqual([3, 7, 9]);
  });

  it("may use a practised skill from before the placement anchor", () => {
    const early = confirmed("g3-add-sub", { reviewDueAt: today, recallStep: 0 });
    expect(
      planNextQuestion({
        grade: 3,
        cards: [early],
        sessionCount: 2,
        today,
        startSkillId: "g3-place",
      }),
    ).toMatchObject({ skillId: "g3-add-sub", kind: "review" });
    expect(
      planNextQuestion({
        grade: 3,
        cards: [early],
        sessionCount: 0,
        today,
        startSkillId: "g3-place",
      }).skillId,
    ).toBe("g3-place");
  });

  it("does not review a skill the child has not practised", () => {
    const untouched = {
      skillId: "g3-add-sub",
      attempted: 0,
      correct: 0,
      streak: 0,
      fsrs: writeLearn(null, { lessonCheck: "passed", reviewDueAt: today, recallStep: 0 }),
    };
    const plan = planNextQuestion({
      grade: 3,
      cards: [untouched],
      sessionCount: 2,
      today,
      startSkillId: "g3-place",
    });
    expect(plan.kind).toBe("focus");
    expect(plan.skillId).toBe("g3-place");
  });

  it("opens the on-ramp after a miss and does not call it review", () => {
    const missed = confirmed("g1-count", { reviewDueAt: today, recallStep: 1, needsReview: true });
    const plan = planNextQuestion({ grade: 1, cards: [missed], sessionCount: 2, today });
    expect(plan).toMatchObject({ skillId: "g1-count", kind: "review", onRamp: true });
    expect(JSON.stringify(plan)).not.toMatch(/demot|forgot|grade 2/i);
  });
});
