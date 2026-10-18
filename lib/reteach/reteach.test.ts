import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CATCH_UP_ITEMS, GUIDED_EXAMPLES } from "@/lib/reteach/catalog";
import { chooseCraStage } from "@/lib/reteach/cra";
import { needsReviewLine, returnedLine } from "@/lib/reteach/copy";
import { countsTowardCurrentMastery, decideReteach, forcedCatchUp, forcedReteach, outcomeFor, reasoningAllowed } from "@/lib/reteach/decide";
import { plainSkill } from "@/lib/reteach/prereq";
import { markPrerequisiteReview } from "@/lib/reteach/review";
import { renderReteachSql } from "@/lib/reteach/sql";
import { noteBlock, noteJump, packReteachTrace, emptyReteachTrace } from "@/lib/reteach/trace";
import { RETURN_LINE } from "@/lib/reteach/types";
import { readLearn } from "@/lib/practice/memory";
import { emptyCard } from "@/lib/practice/scheduler";
import type { FirstTry } from "@/lib/reteach/types";

const migrationPath = "supabase/migrations/20261018180106_reteach_catch_up.sql";

function miss(itemId: string, prerequisiteSkillId: string | null, correct = false): FirstTry {
  return { itemId, prerequisiteSkillId, correct };
}

describe("re-teach trigger", () => {
  it("starts after three first-try misses in a row on the same prerequisite", () => {
    const decision = decideReteach({
      phase: "practice",
      currentSkill: "g3-add-sub",
      firstTries: [miss("a", "g2-add-sub"), miss("b", "g2-add-sub"), miss("c", "g2-add-sub")],
      taughtToday: [],
      prereqAnswered: 0,
      prereqCorrect: 0,
      savedIndex: 0,
      activePrerequisite: null,
    });
    expect(decision).toMatchObject({
      action: "start",
      prerequisiteSkillId: "g2-add-sub",
      triggerItemIds: ["a", "b", "c"],
      savedIndex: 3,
    });
  });

  it("resets the streak when the prerequisite changes or a first try is right", () => {
    const shared = {
      phase: "practice" as const,
      currentSkill: "g3-add-sub",
      taughtToday: [],
      prereqAnswered: 0,
      prereqCorrect: 0,
      savedIndex: 0,
      activePrerequisite: null,
    };
    expect(
      decideReteach({
        ...shared,
        firstTries: [miss("a", "g2-add-sub"), miss("b", "g2-place"), miss("c", "g2-add-sub")],
      }).action,
    ).toBe("continue");
    expect(
      decideReteach({
        ...shared,
        firstTries: [miss("a", "g2-add-sub"), miss("b", "g2-add-sub", true), miss("c", "g2-add-sub"), miss("d", "g2-add-sub")],
      }).action,
    ).toBe("continue");
  });

  it("teaches a prerequisite at most once a day, and does not loop after two prereq misses", () => {
    const ready = {
      phase: "practice" as const,
      currentSkill: "g3-add-sub",
      firstTries: [miss("a", "g2-add-sub"), miss("b", "g2-add-sub"), miss("c", "g2-add-sub")],
      taughtToday: ["g2-add-sub"],
      prereqAnswered: 0,
      prereqCorrect: 0,
      savedIndex: 0,
      activePrerequisite: null,
    };
    expect(decideReteach(ready).action).toBe("continue");

    const weak = decideReteach({
      phase: "reteach",
      currentSkill: "g3-add-sub",
      firstTries: [],
      taughtToday: [],
      prereqAnswered: 3,
      prereqCorrect: 1,
      savedIndex: 3,
      activePrerequisite: "g2-add-sub",
    });
    expect(weak.action).toBe("needs_review");
    expect(outcomeFor({ answered: 3, correct: 1, leftEarly: false })).toBe("needs_review");

    const back = decideReteach({
      phase: "reteach",
      currentSkill: "g3-add-sub",
      firstTries: [],
      taughtToday: [],
      prereqAnswered: 3,
      prereqCorrect: 2,
      savedIndex: 3,
      activePrerequisite: "g2-add-sub",
    });
    expect(back).toMatchObject({ action: "return", savedIndex: 3, line: RETURN_LINE });
  });

  it("keeps re-teach off the current skill mastery and off explain prompts", () => {
    expect(countsTowardCurrentMastery("reteach")).toBe(false);
    expect(countsTowardCurrentMastery("practice")).toBe(true);
    expect(reasoningAllowed("reteach")).toBe(false);
    expect(reasoningAllowed("practice")).toBe(true);
    const card = emptyCard("g3-add-sub");
    const marked = markPrerequisiteReview(emptyCard("g2-add-sub"), "2026-10-18");
    expect(card.attempted).toBe(0);
    expect(marked.attempted).toBe(0);
    expect(marked.correct).toBe(0);
    expect(readLearn(marked.fsrs).needsReview).toBe(true);
    expect(readLearn(card.fsrs).needsReview).toBeUndefined();
  });

  it("ignores the dev switches in production", () => {
    expect(forcedReteach("1", "production")).toBe(false);
    expect(forcedReteach("1", "development")).toBe(true);
    expect(forcedCatchUp("1", "production")).toBe(false);
    expect(forcedCatchUp("1", "development")).toBe(true);
  });
});

describe("catch-up stage", () => {
  it("moves concrete to abstract and waits for two sets", () => {
    expect(chooseCraStage({ segment: "catch_up", accuracy: 0.4, previous: null, setsAtCandidate: 0 })).toBe("concrete");
    expect(chooseCraStage({ segment: "catch_up", accuracy: 0.7, previous: null, setsAtCandidate: 0 })).toBe(
      "representational",
    );
    expect(chooseCraStage({ segment: "catch_up", accuracy: 0.9, previous: "representational", setsAtCandidate: 1 })).toBe(
      "representational",
    );
    expect(chooseCraStage({ segment: "catch_up", accuracy: 0.9, previous: "representational", setsAtCandidate: 2 })).toBe(
      "abstract",
    );
    expect(chooseCraStage({ segment: "standard", accuracy: 0.2, previous: null, setsAtCandidate: 0 })).toBe("abstract");
  });

  it("drafts 24 catch-up items and 10 guided examples", () => {
    expect(CATCH_UP_ITEMS).toHaveLength(24);
    expect(CATCH_UP_ITEMS.filter((item) => item.stage === "concrete").every((item) => item.manipulative !== "none")).toBe(
      true,
    );
    expect(CATCH_UP_ITEMS.filter((item) => item.stage === "abstract").every((item) => item.manipulative === "none")).toBe(
      true,
    );
    expect(GUIDED_EXAMPLES).toHaveLength(10);
    expect(GUIDED_EXAMPLES.every((example) => example.steps.length >= 3)).toBe(true);
    expect(returnedLine(plainSkill("g2-add-sub"))).toBe(
      "We took a quick step back to adding and subtracting within 100, then picked up where we left off.",
    );
    expect(needsReviewLine(plainSkill("g2-place"))).toBe("Tens and ones needs a bit more practice. We've added it to review.");
  });
});

describe("re-teach migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("matches the renderer, stays draft, and keeps parent scope", () => {
    expect(sql).toBe(renderReteachSql());
    expect(sql).toContain('create policy "parents read reteach events"');
    expect(sql).toContain("children.parent_id = (select auth.uid())");
    expect(sql).toContain("current_student_id()");
    expect(sql).toContain("is_content_admin()");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("revoke all on function public.reteach_rate_counts() from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.reteach_rate_counts() to authenticated");
    expect(sql).not.toMatch(/returns table \([\s\S]*child_id/);
    expect(sql).not.toMatch(/'published'/);
    expect(sql.match(/'draft'/g)?.length).toBe(34);
    expect(sql).toContain("segment_variant in ('catch_up', 'standard', 'go_further')");
    expect(sql.match(/,\n  'catch_up'/g)?.length).toBe(24);
    const packed = packReteachTrace(noteJump(noteBlock(emptyReteachTrace(), "group", 10), 1));
    expect(JSON.parse(packed)).toMatchObject({ v: 1, j: [1], b: ["g10"] });
  });
});
