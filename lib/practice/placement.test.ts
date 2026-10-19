import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlacementCheck } from "@/components/placement-check";
import { StartingPoint } from "@/components/starting-point";
import { planNextQuestion } from "@/lib/practice/learning";
import {
  beginPlacement,
  gradePromptTitle,
  gradeSkipLine,
  markPlacementAnswer,
  mixSkillId,
  outcomeFromMarks,
  parentAdjustLine,
  parentPlacementCopy,
  parentReadyLine,
  parentStartLine,
  placementItems,
  startingPointAtGrade,
  startingPointAtStrand,
  stepPlacement,
  PLACEMENT_GOT_IT,
  PLACEMENT_INTRO_HELP,
  UNSURE,
} from "@/lib/practice/placement";
import { accuracyScheduler, type SkillCard } from "@/lib/practice/scheduler";
import { warmUpSkill } from "@/lib/practice/skills";

const CHILD_ID = "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c";

function mastered(skillId: string): SkillCard {
  return { skillId, attempted: 10, correct: 8, streak: 4, fsrs: null };
}

describe("placement quick check", () => {
  it("skips grades 1 and 2 and starts with the basics", () => {
    for (const grade of [1, 2] as const) {
      const began = beginPlacement(grade);
      expect(began.kind).toBe("skip");
      if (began.kind !== "skip") continue;
      expect(began.line).toBe(gradeSkipLine(grade));
      expect(began.line).toBe(`Grade ${grade}. We'll start with the basics and adjust as we go.`);
      expect(began.result.placedGrade).toBe(grade);
      expect(began.result.startSkillId).toBe(warmUpSkill(grade).id);
      expect(began.result.readyStrand).toBeNull();
      expect(outcomeFromMarks(grade, [])?.startSkillId).toBe(warmUpSkill(grade).id);
      expect(outcomeFromMarks(grade, ["clear"])).toBeNull();
    }
  });

  it("uses the grade 3 stems and one strand each for the stated grade", () => {
    const items = placementItems(3);
    expect(items.map((item) => item.prompt)).toEqual([
      "What is 47 + 25?",
      "How many tens are in 63?",
      "There are 4 bags with 6 apples in each. How many apples?",
      "Tap the picture that shows one third shaded.",
      "This rectangle is 3 squares wide and 5 long. How many squares?",
    ]);
    expect(items.slice(0, 2).every((item) => item.grade === 2 && item.role === "prior")).toBe(true);
    expect(items.slice(2).map((item) => item.strand)).toEqual(["operations", "number", "measurement"]);
    expect(new Set(items.slice(2).map((item) => item.strand)).size).toBe(3);
  });

  it("stops early when the first two prior-grade answers are misses", () => {
    const items = placementItems(3);
    expect(markPlacementAnswer(items[0], "70")).toBe("miss");
    expect(markPlacementAnswer(items[1], UNSURE)).toBe("miss");
    expect(markPlacementAnswer(items[0], "72")).toBe("clear");
    const step = stepPlacement(3, ["miss", "miss"]);
    expect(step.done).toBe(true);
    if (!step.done) return;
    expect(step.result.earlyStop).toBe(true);
    expect(step.result.placedGrade).toBe(2);
    expect(step.result.startSkillId).toBe(warmUpSkill(2).id);
    expect(step.result.topic).toBe("Addition and subtraction within 100");
    expect(step.result.clearedAll).toBe(false);
    expect(step.result.readyStrand).toBeNull();
    expect(stepPlacement(3, ["miss"]).done).toBe(false);
    expect(stepPlacement(3, ["miss", "clear"]).done).toBe(false);
  });

  it("flags ready for more on one strand when every answer is clear", () => {
    const result = outcomeFromMarks(3, ["clear", "clear", "clear", "clear", "clear"]);
    expect(result).toMatchObject({
      placedGrade: 3,
      startSkillId: "g3-add-sub",
      topic: "Addition and subtraction within 1,000",
      clearedAll: true,
      earlyStop: false,
      readyStrand: "measurement",
      readyStrandLabel: "Measurement",
    });
    expect(mixSkillId(result!)).toBe("g3-perimeter");
    expect(
      planNextQuestion({
        grade: 3,
        cards: [],
        sessionCount: 0,
        startSkillId: result?.startSkillId,
        mixSkillId: mixSkillId(result!) ?? undefined,
      }).skillId,
    ).toBe("g3-add-sub");
    expect(
      planNextQuestion({
        grade: 3,
        cards: [],
        sessionCount: 3,
        startSkillId: result?.startSkillId,
        mixSkillId: "g3-perimeter",
      }).skillId,
    ).toBe("g3-perimeter");
    const copy = parentPlacementCopy("Sam", result!);
    expect(copy.start).toBe(parentStartLine("Sam", result!.topic, 3));
    expect(copy.ready).toBe(parentReadyLine("Sam", "Measurement"));
  });

  it("starts at the stated grade when the check is mixed", () => {
    const result = outcomeFromMarks(3, ["clear", "miss", "miss", "clear", "miss"]);
    expect(result).toMatchObject({
      placedGrade: 3,
      startSkillId: "g3-add-sub",
      earlyStop: false,
      clearedAll: false,
      readyStrand: null,
    });
    expect(parentPlacementCopy("Sam", result!).ready).toBeNull();
    expect(outcomeFromMarks(3, ["clear", "miss"])).toBeNull();
  });

  it("keeps the same check for grades 7 and 8", () => {
    for (const grade of [7, 8] as const) {
      const began = beginPlacement(grade);
      expect(began.kind).toBe("check");
      if (began.kind !== "check") continue;
      expect(began.items).toHaveLength(5);
      expect(began.items[0]?.grade).toBe(grade - 1);
      expect(began.items[1]?.grade).toBe(grade - 1);
      expect(new Set(began.items.slice(2).map((item) => item.strand)).size).toBe(3);
    }
  });

  it("moves only the starting skill when a parent overrides", () => {
    const atGrade = startingPointAtGrade(3);
    expect(atGrade).toMatchObject({
      placedGrade: 3,
      startSkillId: "g3-add-sub",
      readyStrand: null,
      clearedAll: false,
    });
    const topic = startingPointAtStrand(3, "measurement");
    expect(topic?.startSkillId).toBe("g3-perimeter");
    expect(topic?.topic).toBe("Perimeter of rectangles");
    expect(parentAdjustLine("Sam")).toBe("We'll still adjust as Sam practises.");

    expect(
      accuracyScheduler.chooseSkill({
        grade: 3,
        cards: [{ skillId: "g3-perimeter", attempted: 2, correct: 1, streak: 0, fsrs: null }],
        sessionCount: 0,
        startSkillId: "g3-perimeter",
      }).id,
    ).toBe("g3-perimeter");
    expect(
      accuracyScheduler.chooseSkill({
        grade: 3,
        cards: [mastered("g3-perimeter")],
        sessionCount: 0,
        startSkillId: "g3-perimeter",
      }).id,
    ).toBe("g3-time");
    expect(accuracyScheduler.chooseSkill({ grade: 3, cards: [], sessionCount: 0 }).id).toBe("g3-add-sub");
    expect(gradePromptTitle("Sam")).toBe("What grade is Sam in?");
  });
});

describe("placement screens", () => {
  it("reads the kid lines aloud and does not show a score", () => {
    const intro = renderToStaticMarkup(createElement(PlacementCheck, { childId: CHILD_ID, grade: 3 }));
    expect(intro).toContain("Let&#x27;s do a quick check so we know where to start.");
    expect(intro).toContain(PLACEMENT_INTRO_HELP);
    expect(intro).toContain("I&#x27;m ready");
    expect(intro).toContain('aria-label="Read aloud"');
    expect(intro.toLowerCase()).not.toContain("score");
    expect(intro).not.toContain("Grade 2");
    expect(intro).not.toContain(PLACEMENT_GOT_IT);

    const skip = renderToStaticMarkup(createElement(PlacementCheck, { childId: CHILD_ID, grade: 1 }));
    expect(skip).toContain("Grade 1. We&#x27;ll start with the basics and adjust as we go.");
    expect(skip).toContain("Let&#x27;s begin.");
    expect(skip).not.toContain("quick check");
    expect(skip).not.toContain("Nice work");
  });

  it("offers the parent two ways to change the starting point", () => {
    const html = renderToStaticMarkup(
      createElement(StartingPoint, {
        childId: CHILD_ID,
        firstName: "Sam",
        grade: 3,
        adjusted: true,
        startOpen: true,
      }),
    );
    expect(html).toContain("Change starting point");
    expect(html).toContain("Start at Sam&#x27;s grade");
    expect(html).toContain("Pick a topic to start with");
    expect(html).toContain("We&#x27;ll still adjust as Sam practises.");
    expect(html).not.toContain("score");
  });
});
