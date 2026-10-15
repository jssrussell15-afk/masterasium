import { describe, expect, it } from "vitest";
import { applyLearning } from "@/lib/practice/learning";
import { addDays } from "@/lib/practice/dates";
import { introCycleDue, introContent, nearTransfer, promptShape, buildSkillIntro } from "@/lib/practice/intro";
import { INTRO_PLACEHOLDER, INTRO_SECONDS, introProgress, introStyle } from "@/lib/practice/intro-view";
import { readLearn, readMemory, writeLearn, writeMemory } from "@/lib/practice/memory";
import { noteMistake } from "@/lib/practice/mistakes";
import { emptyCard } from "@/lib/practice/scheduler";
import { skillById } from "@/lib/practice/skills";

const today = "2026-10-14";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("topic intro", () => {
  it("plays for a brand-new skill and stays quiet once the flag is stored", () => {
    expect(
      introCycleDue({
        attempted: 0,
        learn: {},
        today,
        lastAttempt: null,
        kind: "focus",
      }),
    ).toBe("new");

    expect(
      introCycleDue({
        attempted: 0,
        learn: { introSeenAt: today, introCycle: "new" },
        today,
        lastAttempt: null,
        kind: "focus",
      }),
    ).toBeNull();
  });

  it("does not introduce a skill that is already in progress", () => {
    expect(
      introCycleDue({
        attempted: 4,
        learn: {},
        today,
        lastAttempt: today,
        kind: "focus",
      }),
    ).toBeNull();
    expect(
      introCycleDue({
        attempted: 4,
        learn: {},
        today,
        lastAttempt: null,
        kind: "review",
      }),
    ).toBeNull();
  });

  it("replays after 30 days and not on a normal review", () => {
    expect(
      introCycleDue({
        attempted: 6,
        learn: { introSeenAt: "2026-08-01" },
        today,
        lastAttempt: addDays(today, -30),
        kind: "review",
      }),
    ).toBe("relearn");

    expect(
      introCycleDue({
        attempted: 6,
        learn: {},
        today,
        lastAttempt: addDays(today, -14),
        kind: "review",
      }),
    ).toBeNull();

    expect(
      introCycleDue({
        attempted: 6,
        learn: {},
        today,
        lastAttempt: addDays(today, -29),
        kind: "focus",
      }),
    ).toBeNull();

    expect(
      introCycleDue({
        attempted: 6,
        learn: { introSeenAt: today, introCycle: "relearn" },
        today,
        lastAttempt: addDays(today, -40),
        kind: "focus",
      }),
    ).toBeNull();
  });

  it("plays once when a rollback cycle starts", () => {
    expect(
      introCycleDue({
        attempted: 8,
        learn: { introSeenAt: "2026-09-01", introCycle: "new" },
        today,
        lastAttempt: today,
        kind: "support",
        supportLeft: 3,
      }),
    ).toBe("rollback");

    expect(
      introCycleDue({
        attempted: 8,
        learn: { introSeenAt: today, introCycle: "rollback" },
        today,
        lastAttempt: today,
        kind: "support",
        supportLeft: 3,
      }),
    ).toBeNull();

    expect(
      introCycleDue({
        attempted: 8,
        learn: {},
        today,
        lastAttempt: today,
        kind: "support",
        supportLeft: 2,
      }),
    ).toBeNull();

    expect(
      introCycleDue({
        attempted: 8,
        learn: { supportLeft: 3 },
        today,
        lastAttempt: today,
        kind: "focus",
        supportLeft: 3,
      }),
    ).toBeNull();
  });

  it("keeps the intro flag through learn saves and later answers", () => {
    const fsrs = writeLearn(
      { due: "later", extra: true },
      { introSeenAt: "2026-10-01", introCycle: "new", reviewHits: 2 },
    );
    expect(readLearn(fsrs)).toMatchObject({
      introSeenAt: "2026-10-01",
      introCycle: "new",
      reviewHits: 2,
    });
    expect(readMemory(fsrs).payload).toEqual({ due: "later", extra: true });

    const noted = noteMistake(
      { ...emptyCard("g1-add-10"), fsrs },
      "off-by-one",
    );
    expect(readLearn(noted.card.fsrs).introSeenAt).toBe("2026-10-01");
    expect(readMemory(noted.card.fsrs).mistakes).toEqual({ "off-by-one": 1 });
    expect(readMemory(noted.card.fsrs).payload).toEqual({ due: "later", extra: true });

    const answered = applyLearning({
      card: { ...emptyCard("g1-add-10"), attempted: 2, correct: 1, fsrs },
      correct: false,
      kind: "focus",
      today,
    });
    expect(readLearn(answered.card.fsrs).introCycle).toBe("new");
    expect(readLearn(answered.card.fsrs).introSeenAt).toBe("2026-10-01");
    expect(readLearn(answered.card.fsrs).missStreak).toBe(1);

    const dropped = readLearn({
      fsrs: { due: "later" },
      mistakes: { "off-by-one": 1 },
      learn: { introSeenAt: "yesterday", introCycle: "later", reviewDueAt: "2026-10-01" },
    });
    expect(dropped.introSeenAt).toBeUndefined();
    expect(dropped.introCycle).toBeUndefined();
    expect(dropped.reviewDueAt).toBe("2026-10-01");
    expect(readMemory(writeMemory(fsrs, {})).payload).toEqual({ due: "later", extra: true });
  });

  it("asks a near-transfer of the worked example", () => {
    const skill = skillById("g1-add-10");
    expect(skill).toBeDefined();
    if (!skill) return;
    const intro = buildSkillIntro(skill, "new");
    expect(intro.beats.some((beat) => beat.prompt === skill.examplePrompt)).toBe(true);
    const question = nearTransfer(skill, mulberry32(4));
    expect(question.prompt).not.toBe(skill.examplePrompt);
    expect(promptShape(question.prompt)).toBe(promptShape(skill.examplePrompt));
    expect(promptShape("In 3,482, what is the value of the thousands digit?")).toBe(
      "In #, what is the value of the thousands digit?",
    );
    expect(promptShape("0.4 + 0.3 = ?")).toBe("# + # = ?");
  });

  it("uses a placeholder and a grade-sized intro when no asset exists", () => {
    expect(INTRO_PLACEHOLDER).toBe("Quick intro coming soon");
    expect(introStyle(1)).toBe("visual");
    expect(introStyle(3)).toBe("visual");
    expect(introStyle(4)).toBe("steps");
    expect(introStyle(8)).toBe("steps");
    expect(introStyle(9)).toBe("why");

    const early = skillById("g1-add-10");
    expect(early).toBeDefined();
    if (!early) return;
    const visual = buildSkillIntro(early, "new");
    expect(visual.placeholder).toBe("Quick intro coming soon");
    expect(visual.asset).toBeNull();
    expect(visual.seconds).toBe(INTRO_SECONDS);
    expect(visual.style).toBe("visual");
    expect(visual.beats).toHaveLength(1);
    expect(visual.beats[0]?.answer).toBe(early.exampleAnswer);

    const later = skillById("g4-equiv");
    expect(later).toBeDefined();
    if (!later) return;
    const steps = buildSkillIntro(later, "relearn");
    expect(steps.style).toBe("steps");
    expect(steps.beats).toHaveLength(2);
    expect(steps.beats[0]?.prompt).toBe(later.examplePrompt);
    expect(steps.beats[1]?.steps).toEqual(later.exampleSteps);

    const why = introContent(9, {
      summary: "Subtract the same amount from both sides.",
      examplePrompt: "n + 3 = 10. What is n?",
      exampleSteps: ["Subtract 3 from both sides.", "n = 7."],
      exampleAnswer: "7",
    });
    expect(why.style).toBe("why");
    expect(why.beats[0]?.caption).toBe("Subtract the same amount from both sides.");
    expect(why.beats[1]?.steps).toEqual(["Subtract 3 from both sides.", "n = 7."]);
  });

  it("finishes at 10 seconds and splits beats inside that same countdown", () => {
    expect(introProgress(0, 10, 1)).toEqual({ beat: 0, remaining: 10, done: false });
    expect(introProgress(4999, 10, 2)).toEqual({ beat: 0, remaining: 6, done: false });
    expect(introProgress(5000, 10, 2)).toEqual({ beat: 1, remaining: 5, done: false });
    expect(introProgress(10000, 10, 2)).toEqual({ beat: 1, remaining: 0, done: true });
    expect(introProgress(10000, 10, 1)).toEqual({ beat: 0, remaining: 0, done: true });
  });
});
