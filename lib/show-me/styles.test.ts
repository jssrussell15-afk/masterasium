import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { explainPack } from "@/lib/content/rules";
import { auditShowStyles, presentedSteps, whyAfterBuggy } from "@/lib/show-me/check";
import { buggyParentLine, packShowMeLog, readShowMeLog } from "@/lib/show-me/log";
import { chooseShowMeStyle, forcedShowMeStyle, recentAccuracy } from "@/lib/show-me/select";
import { renderShowMeSql } from "@/lib/show-me/sql";
import { SHOW_TEMPLATES, TIME_MIXUP } from "@/lib/show-me/templates";
import { isMastered, emptyCard } from "@/lib/practice/scheduler";
import type { StyleInput } from "@/lib/show-me/types";

const migrationPath = "supabase/migrations/20261018174159_show_me_styles.sql";

function tries(hits: number, total = 10): boolean[] {
  return Array.from({ length: total }, (_, index) => index < hits);
}

function input(over: Partial<StyleInput> = {}): StyleInput {
  return {
    segment: "on-level",
    recentFirstTries: tries(6),
    mastery: "below",
    helpsInLast5: 0,
    evalLevel: "building",
    stuck: false,
    previousStyle: null,
    setsAtCandidate: 0,
    ...over,
  };
}

describe("show me style selector", () => {
  it("uses guided under 60% or after two helps, standard from 60% to 84%, and buggy at 85% when the skill is strong", () => {
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(5) })).style).toBe("guided");
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(6) })).style).toBe("standard");
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(8), mastery: "mastered" })).style).toBe("standard");
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "mastered" })).style).toBe("buggy");
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "review-passed" })).style).toBe("buggy");
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "below", segment: "on-level" })).style).toBe(
      "standard",
    );
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "below", segment: "go-further" })).style).toBe(
      "buggy",
    );
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "mastered", helpsInLast5: 2 })).style).toBe(
      "guided",
    );
  });

  it("waits for two sets before it changes style", () => {
    const rising = input({ recentFirstTries: tries(9), mastery: "mastered", previousStyle: "standard", setsAtCandidate: 1 });
    expect(chooseShowMeStyle(rising).style).toBe("standard");
    expect(chooseShowMeStyle({ ...rising, setsAtCandidate: 2 }).style).toBe("buggy");
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "mastered" })).style).toBe("buggy");
  });

  it("always walks a stuck child, even on a mastered go-further skill", () => {
    const choice = chooseShowMeStyle(
      input({
        stuck: true,
        segment: "go-further",
        mastery: "mastered",
        recentFirstTries: tries(10),
        previousStyle: "buggy",
        setsAtCandidate: 2,
      }),
    );
    expect(choice.style).toBe("guided");
    expect(choice.reason).toBe("Two misses on this question.");
    expect(choice.snapshot.stuck).toBe(true);
  });

  it("leans on placement when the recent window is still short", () => {
    expect(recentAccuracy(tries(7, 7))).toBeNull();
    expect(chooseShowMeStyle(input({ recentFirstTries: tries(7, 7), segment: "catch-up" })).style).toBe("guided");
    expect(chooseShowMeStyle(input({ recentFirstTries: [], segment: "on-level", evalLevel: "building" })).style).toBe(
      "standard",
    );
    expect(
      chooseShowMeStyle(input({ recentFirstTries: [], segment: "go-further", evalLevel: "strong", mastery: "below" }))
        .style,
    ).toBe("buggy");
  });

  it("ignores a forced style in production", () => {
    expect(forcedShowMeStyle("buggy", "production")).toBeNull();
    expect(forcedShowMeStyle("guided", "development")).toBe("guided");
  });
});

describe("show me style drafts", () => {
  it("checks one wrong step, a different result, matching captions, and the generator answer", () => {
    expect(auditShowStyles()).toEqual([]);
    expect(SHOW_TEMPLATES).toHaveLength(5);
    expect(SHOW_TEMPLATES.reduce((sum, template) => sum + template.buggy.length, 0)).toBe(10);
    const add = explainPack("explain-add", { a: 46, b: 27 });
    const regroup = SHOW_TEMPLATES[0];
    expect(regroup?.buggy.map((variant) => variant.wrongCaption)).toEqual([add.choices[1], add.choices[2]]);
    const groups = explainPack("explain-groups", { g: 4, n: 6 });
    expect(SHOW_TEMPLATES[1]?.buggy.map((variant) => variant.wrongCaption)).toEqual([groups.choices[1], groups.choices[2]]);
    const fraction = explainPack("explain-fraction", { hops: 3, den: 4 });
    expect(SHOW_TEMPLATES[2]?.buggy.map((variant) => variant.wrongCaption)).toEqual([
      fraction.choices[1],
      fraction.choices[2],
    ]);
    const place = explainPack("explain-place", { n: 352, digit: 5, place: 10 });
    expect(SHOW_TEMPLATES[3]?.buggy.map((variant) => variant.wrongCaption)).toEqual([place.choices[1], place.choices[2]]);
    expect(SHOW_TEMPLATES[4]?.buggy[0]?.wrongCaption).toBe(TIME_MIXUP.wrong(2));
    for (const template of SHOW_TEMPLATES) {
      for (const variant of template.buggy) {
        const shown = presentedSteps(template, variant);
        expect(shown.filter((step) => step.wrong)).toHaveLength(1);
        expect(template.answer.length).toBeGreaterThan(0);
      }
    }
  });

  it("asks why the step was wrong at most twice in a set", () => {
    expect(whyAfterBuggy(0)).toBe("Why was that step wrong?");
    expect(whyAfterBuggy(1)).toBe("Why was that step wrong?");
    expect(whyAfterBuggy(2)).toBeNull();
  });

  it("logs the style snapshot and keeps it off the mastery card", () => {
    const choice = chooseShowMeStyle(input({ recentFirstTries: tries(9), mastery: "mastered" }));
    const stored = packShowMeLog("73", ["Trade 10 ones for a ten."], choice.snapshot);
    expect(readShowMeLog(stored)?.style).toBe("buggy");
    expect(readShowMeLog(stored)?.reason).toBe(choice.reason);
    expect(isMastered(emptyCard("g3-add-sub"))).toBe(false);
    expect(buggyParentLine(["guided", "buggy"])).toBe("Checked a worked example for mistakes");
    expect(buggyParentLine(["guided"])).toBeNull();
  });

  it("matches the migration and leaves every row a draft", () => {
    const sql = renderShowMeSql();
    expect(sql).toContain("template.variants");
    expect(sql).toContain("show_me_style");
    expect(sql).toContain("hour_stays_past_sixty");
    expect(sql).not.toMatch(/'published'/);
    expect(sql).toContain("'draft'");
    expect(readFileSync(migrationPath, "utf8")).toBe(sql);
  });
});
