import { describe, expect, it } from "vitest";
import { assistFor } from "@/lib/practice/assist";
import { badgeTree } from "@/lib/practice/badges";
import { addDays } from "@/lib/practice/dates";
import { applyLearning, planNextQuestion } from "@/lib/practice/learning";
import { readLearn, readMemory, writeLearn } from "@/lib/practice/memory";
import { noteMistake } from "@/lib/practice/mistakes";
import { buildPortrait } from "@/lib/practice/portrait";
import { accuracyScheduler, emptyCard, isConfirmed, type SkillCard } from "@/lib/practice/scheduler";
import { skillsForGrade } from "@/lib/practice/skills";
import { sessionRecap } from "@/lib/practice/summary";

const today = "2026-10-13";

function mastered(skillId: string, fsrs: unknown = null): SkillCard {
  return { skillId, attempted: 10, correct: 8, consecutiveCorrect: 4, fsrs };
}

describe("assisted first questions", () => {
  it("guides the first three questions and then stops", () => {
    const guided = assistFor({
      attempted: 0,
      summary: "Add the two numbers.",
      firstStep: "Start at 4.",
      expected: "7",
      kind: "focus",
    });
    expect(guided).toEqual({ setup: "Add the two numbers.", firstStep: "Start at 4." });
    expect(
      assistFor({
        attempted: 2,
        summary: "Add the two numbers.",
        firstStep: "Start at 4.",
        expected: "7",
        kind: "focus",
      }),
    ).not.toBeNull();
    expect(
      assistFor({
        attempted: 3,
        summary: "Add the two numbers.",
        firstStep: "Start at 4.",
        expected: "7",
        kind: "focus",
      }),
    ).toBeNull();
  });

  it("hides a first step that already states the answer, and stays off checks", () => {
    expect(
      assistFor({
        attempted: 0,
        summary: "Add the two numbers.",
        firstStep: "4 + 3 = 7.",
        expected: "7",
        kind: "focus",
      })?.firstStep,
    ).toBeNull();
    expect(
      assistFor({
        attempted: 0,
        summary: "Add the two numbers.",
        firstStep: "Start at 4.",
        expected: "7",
        kind: "check",
      }),
    ).toBeNull();
  });
});

describe("lesson check", () => {
  it("holds the next skill until the check is passed", () => {
    const crossing = applyLearning({
      card: { skillId: "g1-count", attempted: 9, correct: 8, consecutiveCorrect: 2, fsrs: null },
      correct: true,
      kind: "focus",
      today,
    }).card;
    expect(readLearn(crossing.fsrs).lessonCheck).toBe("due");
    expect(isConfirmed(crossing)).toBe(false);
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards: [crossing], sessionCount: 0 }).id).toBe(
      "g1-count",
    );

    let card = crossing;
    for (const correct of [true, true, false, true]) {
      card = applyLearning({ card, correct, kind: "check", today }).card;
    }
    expect(readLearn(card.fsrs).lessonCheck).toBe("passed");
    expect(readLearn(card.fsrs).reviewDueAt).toBe(addDays(today, 14));
    expect(isConfirmed(card)).toBe(true);
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards: [card], sessionCount: 0 }).id).toBe(
      "g1-add-10",
    );
  });

  it("retries the check when fewer than three are correct", () => {
    let card = { ...mastered("g1-count"), fsrs: writeLearn(null, { lessonCheck: "due" }) };
    for (const correct of [false, false, true, false]) {
      card = applyLearning({ card, correct, kind: "check", today }).card;
    }
    expect(readLearn(card.fsrs).lessonCheck).toBe("retry");
    expect(isConfirmed(card)).toBe(false);
    expect(planNextQuestion({ grade: 1, cards: [card], sessionCount: 4, today }).kind).toBe("check");
  });

  it("still treats an older mastered card as confirmed", () => {
    expect(isConfirmed(mastered("g1-count"))).toBe(true);
  });
});

describe("spaced review", () => {
  it("prefers a due skill on a review turn and flags a miss", () => {
    const count = {
      ...mastered("g1-count"),
      correct: 10,
      fsrs: writeLearn(null, { lessonCheck: "passed", reviewDueAt: "2026-10-01" }),
    };
    const add = {
      ...mastered("g1-add-10"),
      fsrs: writeLearn(null, { lessonCheck: "passed", reviewDueAt: "2026-12-01" }),
    };
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards: [count, add], sessionCount: 3 }).id).toBe(
      "g1-add-10",
    );
    expect(
      accuracyScheduler.chooseSkill({ grade: 1, cards: [count, add], sessionCount: 3, today }).id,
    ).toBe("g1-count");

    const missed = applyLearning({ card: count, correct: false, kind: "review", today }).card;
    expect(readLearn(missed.fsrs).needsReview).toBe(true);
    const once = applyLearning({ card: missed, correct: true, kind: "focus", today }).card;
    expect(readLearn(once.fsrs).needsReview).toBe(true);
    const cleared = applyLearning({ card: once, correct: true, kind: "focus", today }).card;
    expect(readLearn(cleared.fsrs).needsReview).toBeUndefined();
    expect(readLearn(cleared.fsrs).reviewDueAt).toBe(addDays(today, 14));
  });
});

describe("adaptive rollback", () => {
  it("steps back to the previous skill after three misses, then returns", () => {
    const [first, second] = skillsForGrade(1);
    let struggling: SkillCard = { ...emptyCard(second.id), attempted: 2, correct: 0, consecutiveCorrect: 0 };
    for (let miss = 0; miss < 3; miss += 1) {
      struggling = applyLearning({ card: struggling, correct: false, kind: "focus", today }).card;
    }
    expect(readLearn(struggling.fsrs).supportLeft).toBe(3);

    const ready = mastered(first.id);
    const plan = planNextQuestion({
      grade: 1,
      cards: [ready, struggling],
      sessionCount: 16,
      today,
    });
    expect(plan).toMatchObject({
      skillId: first.id,
      kind: "support",
      small: true,
      rollbackSkillId: second.id,
    });

    const support = emptyCard(first.id);
    let parent = struggling;
    for (let spent = 0; spent < 3; spent += 1) {
      const applied = applyLearning({
        card: support,
        correct: true,
        kind: "support",
        today,
        rollbackCard: parent,
      });
      parent = applied.extra ?? parent;
    }
    expect(readLearn(parent.fsrs).supportLeft).toBeUndefined();
    expect(readLearn(parent.fsrs).consecutiveMisses).toBeUndefined();
    expect(
      planNextQuestion({ grade: 1, cards: [ready, parent], sessionCount: 16, today }).kind,
    ).not.toBe("support");
  });
});

describe("summaries and badges", () => {
  it("writes a one or two line recap from today's work", () => {
    expect(
      sessionRecap({
        todayAttempted: 8,
        todayCorrect: 8,
        skillTitle: "Addition within 10",
        earlierAttempted: 0,
        earlierCorrect: 0,
      }),
    ).toBe("You got 8 of 8 today, and Addition within 10 is getting easier.");
    expect(
      sessionRecap({
        todayAttempted: 10,
        todayCorrect: 4,
        skillTitle: "Regrouping",
        earlierAttempted: 10,
        earlierCorrect: 9,
      }),
    ).toBe("You got 4 of 10 today, and Regrouping needs another look.");
    expect(
      sessionRecap({
        todayAttempted: 2,
        todayCorrect: 2,
        skillTitle: "Counting",
        earlierAttempted: 0,
        earlierCorrect: 0,
      }),
    ).toBe("You got 2 of 2 today.");
  });

  it("adds one piece per confirmed skill", () => {
    const pieces = badgeTree([
      { id: "a", title: "Counting", confirmed: true },
      { id: "b", title: "Adding", confirmed: false },
      { id: "c", title: "Subtracting", confirmed: true },
      { id: "d", title: "Groups", confirmed: true },
      { id: "e", title: "Sharing", confirmed: true },
      { id: "f", title: "Places", confirmed: true },
    ]).map((badge) => badge.piece);
    expect(pieces).toEqual(["helmet", "shield", "boots", "cape", "helmet"]);
  });

  it("keeps mistake counts beside the new learn state", () => {
    const card = {
      ...emptyCard("g1-count"),
      fsrs: writeLearn({ due: "later" }, { consecutiveMisses: 2 }),
    };
    const noted = noteMistake(card, "off-by-one");
    expect(readMemory(noted.card.fsrs).payload).toEqual({ due: "later" });
    expect(readMemory(noted.card.fsrs).mistakes).toEqual({ "off-by-one": 1 });
    expect(readLearn(noted.card.fsrs).consecutiveMisses).toBe(2);
  });

  it("builds the same portrait the dashboard and digest share", () => {
    const passed = applyLearning({
      card: { ...mastered("g1-count"), fsrs: writeLearn(null, { lessonCheck: "due" }) },
      correct: true,
      kind: "check",
      today,
    });
    let card = passed.card;
    card = applyLearning({ card, correct: true, kind: "check", today }).card;
    card = applyLearning({ card, correct: true, kind: "check", today }).card;
    card = applyLearning({ card, correct: true, kind: "check", today }).card;
    const portrait = buildPortrait({
      grade: 1,
      cards: [card],
      attempts: [
        { skillId: "g1-count", correct: true, date: today },
        { skillId: "g1-count", correct: true, date: today },
        { skillId: "g1-count", correct: true, date: today },
        { skillId: "g1-count", correct: true, date: today },
        { skillId: "g1-count", correct: true, date: "2026-10-12" },
        { skillId: "g1-count", correct: true, date: "2026-10-11" },
      ],
      today,
    });
    expect(portrait.badges.map((badge) => badge.piece)).toEqual(["helmet"]);
    expect(portrait.recap).toMatch(/^You got 4 of 4 today/);
    expect(portrait.needsReview).toEqual([]);
  });
});
