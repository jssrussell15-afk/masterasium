import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ShowMeSamplePage from "@/app/preview/show-me/page";
import {
  applyShowGap,
  applyShowOnAttempt,
  clipKidLine,
  daysAgo,
  defaultShowLevel,
  exampleBlanks,
  exampleLines,
  FILL_CAPTION,
  kidWordCount,
  resolvedShowLevel,
  showDownBar,
  spokenSteps,
  stepLines,
  supportAfterCheck,
  walkBlanks,
} from "@/lib/practice/fade";
import { additionWalk } from "@/lib/practice/walk";
import { applyLearning } from "@/lib/practice/learning";
import { readLearn, writeLearn } from "@/lib/practice/memory";
import type { SkillCard } from "@/lib/practice/scheduler";

const today = "2026-10-22";

function card(skillId: string, learn: Parameters<typeof writeLearn>[1], streak = 0): SkillCard {
  return {
    skillId,
    attempted: streak,
    correct: streak,
    streak,
    fsrs: writeLearn(null, learn),
  };
}

function answer(
  current: SkillCard,
  input: {
    correct: boolean;
    attemptId: string;
    today?: string;
    kind?: "focus" | "review";
    showedHow?: boolean;
    showedExample?: boolean;
    grade?: number;
    hasWalk?: boolean;
  },
): SkillCard {
  const grade = input.grade ?? (current.skillId.startsWith("g1-") ? 1 : 3);
  const hasWalk = input.hasWalk ?? !current.skillId.startsWith("g1-");
  return applyLearning({
    card: current,
    correct: input.correct,
    kind: input.kind ?? "focus",
    today: input.today ?? today,
    showedHow: input.showedHow,
    showedExample: input.showedExample,
    grade,
    hasWalk,
    attemptId: input.attemptId,
  }).card;
}

describe("show me support defaults", () => {
  it("starts a walk skill at the full example and every other skill on a hint", () => {
    expect(defaultShowLevel(true)).toBe(1);
    expect(defaultShowLevel(false)).toBe(3);
    expect(resolvedShowLevel(undefined, true)).toBe(1);
    expect(resolvedShowLevel(undefined, false)).toBe(3);
    expect(showDownBar(3, 1)).toBe(3);
    expect(showDownBar(3, 2)).toBe(5);
    expect(showDownBar(3, 3)).toBe(8);
    expect(showDownBar(1, 1)).toBe(5);
    expect(showDownBar(1, 2)).toBe(8);
    expect(showDownBar(2, 3)).toBe(12);
    expect(showDownBar(4, 4)).toBeNull();
  });

  it("keeps the level inside the stored learn object", () => {
    const stored = writeLearn(null, { showLevel: 2, showDays: 2, showDay: today, showGapOn: today });
    expect(readLearn(stored)).toMatchObject({
      showLevel: 2,
      showDays: 2,
      showDay: today,
      showGapOn: today,
    });
  });
});

describe("show me steps down", () => {
  it("steps down for Grades 3–8 when consecutive correct reaches the bar", () => {
    let current = card("g3-add-sub", { showLevel: 1 });
    current = answer(current, { correct: true, attemptId: "a1" });
    current = answer(current, { correct: true, attemptId: "a2" });
    expect(readLearn(current.fsrs).showLevel).toBe(1);
    expect(current.streak).toBe(2);

    current = answer(current, { correct: true, attemptId: "a3" });
    expect(readLearn(current.fsrs).showLevel).toBe(2);
    expect(current.streak).toBe(3);

    current = answer(current, { correct: true, attemptId: "a4" });
    expect(readLearn(current.fsrs).showLevel).toBe(2);
    current = answer(current, { correct: true, attemptId: "a5" });
    expect(readLearn(current.fsrs).showLevel).toBe(3);
    expect(current.streak).toBe(5);

    current = answer(current, { correct: true, attemptId: "a6" });
    current = answer(current, { correct: true, attemptId: "a7" });
    expect(readLearn(current.fsrs).showLevel).toBe(3);
    current = answer(current, { correct: true, attemptId: "a8" });
    expect(readLearn(current.fsrs).showLevel).toBe(4);
    expect(current.streak).toBe(8);
  });

  it("does not step down on the item that opened Show me", () => {
    const opened = answer(card("g3-add-sub", { showLevel: 1 }, 2), {
      correct: false,
      showedHow: true,
      attemptId: "show",
    });
    expect(readLearn(opened.fsrs).showLevel).toBe(1);
    expect(opened.streak).toBe(0);

    const later = answer(opened, { correct: true, attemptId: "after" });
    expect(readLearn(later.fsrs).showLevel).toBe(1);
    expect(later.streak).toBe(1);
  });

  it("keeps a recall unclean when an example was opened, and can still step support down", () => {
    const current = card("g3-fractions", {
      showLevel: 2,
      lessonCheck: "passed",
      recallStep: 1,
      reviewDueAt: today,
    }, 4);
    const next = answer(current, { correct: true, showedExample: true, attemptId: "example", kind: "review" });
    const learn = readLearn(next.fsrs);
    expect(learn.showLevel).toBe(3);
    expect(learn.recallStep).toBe(1);
    expect(learn.recallFreshOn).toBeUndefined();
  });
});

describe("show me steps up", () => {
  it("steps up one level after two first-try misses, not after one", () => {
    let current = card("g3-mult", { showLevel: 4 });
    current = answer(current, { correct: false, attemptId: "miss-1" });
    expect(readLearn(current.fsrs).showLevel).toBe(4);
    expect(readLearn(current.fsrs).showMisses).toBe(1);

    current = answer(current, { correct: false, attemptId: "miss-2" });
    expect(readLearn(current.fsrs).showLevel).toBe(3);
    expect(readLearn(current.fsrs).showMisses).toBe(2);
  });

  it("steps up one level when a spaced review item is missed", () => {
    const missed = answer(card("g3-time", { showLevel: 3 }), {
      correct: false,
      kind: "review",
      attemptId: "review-miss",
    });
    expect(readLearn(missed.fsrs).showLevel).toBe(2);
  });

  it("steps up once for a 14 day gap and returns to the full example after 30", () => {
    const quiet = applyShowGap(
      { showLevel: 4 },
      { lastDay: daysAgo(today, 14), today, hasWalk: true },
    );
    expect(quiet.showLevel).toBe(3);
    expect(quiet.showGapOn).toBe(today);
    expect(applyShowGap(quiet, { lastDay: daysAgo(today, 14), today, hasWalk: true }).showLevel).toBe(3);

    const month = applyShowGap(
      { showLevel: 3 },
      { lastDay: daysAgo(today, 30), today, hasWalk: false },
    );
    expect(month.showLevel).toBe(1);
  });

  it("does not step up twice when a gap and a miss land on the same day", () => {
    const gapped = applyShowGap(
      { showLevel: 4 },
      { lastDay: daysAgo(today, 20), today, hasWalk: true },
    );
    const missed = answer(card("g3-add-sub", gapped), {
      correct: false,
      kind: "review",
      attemptId: "same-day",
    });
    expect(readLearn(missed.fsrs).showLevel).toBe(3);
    expect(readLearn(missed.fsrs).showGapOn).toBe(today);
  });
});

describe("Grades 1–2 fade more slowly", () => {
  it("stays on the full example until two different days and the slower bar", () => {
    let current = card("g1-count", { showLevel: 1 });
    for (let index = 1; index <= 5; index += 1) {
      current = answer(current, { correct: true, attemptId: `day1-${index}`, grade: 1, hasWalk: false });
    }
    expect(current.streak).toBe(5);
    expect(readLearn(current.fsrs).showLevel).toBe(1);
    expect(readLearn(current.fsrs).showDays).toBe(1);

    const nextDay = "2026-10-23";
    current = answer(current, { correct: true, attemptId: "day2", today: nextDay, grade: 1, hasWalk: false });
    expect(readLearn(current.fsrs).showLevel).toBe(2);
    expect(readLearn(current.fsrs).showDays).toBe(2);

    let building = card("g1-add-10", { showLevel: 2, showDays: 2, showDay: today }, 7);
    building = answer(building, { correct: true, attemptId: "still", grade: 1, hasWalk: false });
    expect(building.streak).toBe(8);
    expect(readLearn(building.fsrs).showLevel).toBe(3);

    let hint = card("g1-sub-10", { showLevel: 3, showDays: 2, showDay: today }, 11);
    hint = answer(hint, { correct: true, attemptId: "hint", grade: 1, hasWalk: false });
    expect(hint.streak).toBe(12);
    expect(readLearn(hint.fsrs).showLevel).toBe(4);
  });
});

describe("show me replay", () => {
  it("does not move the level a second time for the same attempt", () => {
    const once = answer(card("g3-add-sub", { showLevel: 1 }, 2), {
      correct: true,
      attemptId: "same-attempt",
    });
    expect(readLearn(once.fsrs).showLevel).toBe(2);

    const again = applyShowOnAttempt(readLearn(once.fsrs), {
      grade: 3,
      hasWalk: true,
      correct: true,
      showedHow: false,
      kind: "focus",
      today,
      streak: once.streak + 1,
      attemptId: "same-attempt",
    });
    expect(again.showLevel).toBe(2);
    expect(again.showDays).toBe(readLearn(once.fsrs).showDays);

    const fresh = applyShowOnAttempt(again, {
      grade: 3,
      hasWalk: true,
      correct: true,
      showedHow: false,
      kind: "focus",
      today,
      streak: 5,
      attemptId: "next-attempt",
    });
    expect(fresh.showLevel).toBe(3);
  });
});

const BANNED = /\b(level|levels|fade|faded|fading|streak|badge|badges|points|confetti|mascot|demoted|demotion|timer)\b/i;

describe("the child never sees the support level", () => {
  it("keeps levels 1 to 4 and a Grade 1 example free of fading language", async () => {
    const scenes = ["fade-1", "fade-2", "fade-3", "fade-4", "grade1"] as const;
    for (const scene of scenes) {
      const html = renderToStaticMarkup(await ShowMeSamplePage({ searchParams: Promise.resolve({ scene }) }));
      expect(html).not.toMatch(BANNED);
      expect(html.match(/class="listen"/g)?.length ?? 0).toBe(1);
    }
    const full = renderToStaticMarkup(await ShowMeSamplePage({ searchParams: Promise.resolve({ scene: "fade-1" }) }));
    expect(full).toContain("Add the ones first.");
    expect(full).toContain(">Listen<");
    const partial = renderToStaticMarkup(await ShowMeSamplePage({ searchParams: Promise.resolve({ scene: "fade-2" }) }));
    expect(partial).toContain("Fill in the missing numbers.");
    expect(partial).toContain("Add the ones: 1 + 5 =");
    expect(partial).toContain("Add the tens: 3 + 8 = 11 tens, so trade 10 tens for a hundred.");
    expect(partial).toContain("So 531 + 285 =");
    expect(partial).not.toContain("You fill this step.");
    expect(partial).not.toContain("walk-arrow");
    expect(partial).toContain('aria-label="Number keypad"');
    const hint = renderToStaticMarkup(await ShowMeSamplePage({ searchParams: Promise.resolve({ scene: "fade-3" }) }));
    expect(hint).toContain("Add the ones first.");
    expect(hint).toContain(">Show me<");
    expect(hint).not.toContain('class="show-me"');
    const quiet = renderToStaticMarkup(await ShowMeSamplePage({ searchParams: Promise.resolve({ scene: "fade-4" }) }));
    expect(quiet).toContain(">Show me<");
    expect(quiet).not.toContain("Add the ones first.");
    expect(quiet).not.toContain('class="show-me"');
    const early = renderToStaticMarkup(await ShowMeSamplePage({ searchParams: Promise.resolve({ scene: "grade1" }) }));
    expect(early).toContain("What number comes just after 14?");
    expect(early).toContain("Count one more than 14.");
    expect(early).toContain(">Listen<");
  });
});

describe("show me open and blanks", () => {
  it("opens the full walk on a level 1 miss and the partly filled example later", () => {
    expect(supportAfterCheck({ level: 1, intent: "check", phase: "retry" })).toEqual({
      promote: true,
      mode: "guided",
    });
    expect(supportAfterCheck({ level: 2, intent: "check", phase: "retry" })).toEqual({
      promote: false,
      mode: null,
    });
    expect(supportAfterCheck({ level: 4, intent: "check", phase: "revealed" })).toEqual({
      promote: false,
      mode: "guided",
    });
    expect(supportAfterCheck({ level: 4, intent: "show-me", phase: "revealed" })).toEqual({
      promote: false,
      mode: "faded",
    });
    expect(supportAfterCheck({ level: 1, intent: "show-me", phase: "revealed" })).toEqual({
      promote: false,
      mode: "guided",
    });
  });

  it("blanks one or two key steps and keeps kid lines short", () => {
    expect(walkBlanks("46 + 27 = ?", 4, "73")).toEqual([
      { index: 0, expect: "13" },
      { index: 3, expect: "73" },
    ]);
    expect(exampleBlanks(2, "15")).toEqual([{ index: 1, expect: "15" }]);
    expect(kidWordCount(FILL_CAPTION)).toBeLessThanOrEqual(15);
    expect(clipKidLine("one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen")).toBe(
      "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen",
    );
  });

  it("puts each blank inside the step text", () => {
    const walk = additionWalk(531, 285);
    expect(walk).not.toBeNull();
    const lines = stepLines("531 + 285 = ?", walk?.steps ?? [], "816");
    expect(lines.map((line) => `${line.lead}${line.blank ?? ""}${line.rest}`)).toEqual([
      "Add the ones: 1 + 5 = 6",
      "Add the tens: 3 + 8 = 11 tens, so trade 10 tens for a hundred.",
      "So 531 + 285 = 816",
    ]);
    expect(lines[0]?.lead.startsWith("Add the ones")).toBe(true);
    expect(lines[0]?.blank).toBe("6");
    expect(lines[1]?.blank).toBeNull();
    expect(lines[1]?.rest).toContain("hundred");
    expect(lines[2]?.blank).toBe("816");
    expect(spokenSteps(lines)).toBe(
      "Add the ones: 1 + 5 = blank. Add the tens: 3 + 8 = 11 tens, so trade 10 tens for a hundred. So 531 + 285 = blank.",
    );
    const early = exampleLines(["Count one more than 14.", "14 and one more is 15."], "15");
    expect(early[1]).toMatchObject({ lead: "14 and one more is ", blank: "15", rest: "." });
  });
});
