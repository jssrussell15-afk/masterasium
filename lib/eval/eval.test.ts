import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EVAL_BANK, countByGrade } from "@/lib/eval/bank";
import { asRefs, nextEvalItem, rollupStrand, type EvalRef } from "@/lib/eval/adapt";
import { auditEval } from "@/lib/eval/audit";
import { evalRows } from "@/lib/eval/catalog";
import { EVAL_PREREQ } from "@/lib/eval/links";
import {
  aboutPercent,
  alreadyKnow,
  confirmSets,
  levelForRate,
  placeStrand,
  postIsDue,
  startTitles,
  stepBackSkill,
  strandDelta,
} from "@/lib/eval/place";
import { renderEvalSql } from "@/lib/eval/sql";
import { sampleDeltas, sampleEnd, sampleMap } from "@/lib/eval/samples";
import { EVAL_COUNTS_TOWARD_MASTERY, EVAL_STRANDS, type ServedEval } from "@/lib/eval/types";
import { planNextQuestion } from "@/lib/practice/learning";
import { isMastered, accuracyScheduler, emptyCard } from "@/lib/practice/scheduler";
import { packStoredAnswer, readStoredContent } from "@/lib/practice/stored-answer";

const migrationPath = "supabase/migrations/20261018172557_eval_check_in.sql";

function ref(id: string, grade: number, strand: EvalRef["strand"], skill: string): EvalRef {
  return { id, grade, strand, skill };
}

describe("eval placement", () => {
  it("steps back below 50%, stays from 50% to 85%, and opens the next skill at 85% when move ahead is on", () => {
    const low = placeStrand({ grade: 3, strand: "operations", correct: 1, missed: 3, skipped: 0, moveAhead: true });
    expect(low.level).toBe("not_started");
    expect(low.startSkill).toBe("g2-add-sub");

    const mid = placeStrand({ grade: 3, strand: "operations", correct: 4, missed: 1, skipped: 0, moveAhead: true });
    expect(mid.rate).toBeCloseTo(0.8);
    expect(mid.level).toBe("building");
    expect(mid.startSkill).toBe("g3-add-sub");

    const high = placeStrand({ grade: 3, strand: "number", correct: 17, missed: 3, skipped: 0, moveAhead: true });
    expect(high.level).toBe("strong");
    expect(high.startSkill).toBe("g4-place");
    expect(high.provisionalSkills).toEqual(["g2-place", "g3-place"]);
    expect(high.waitingSkill).toBeNull();
  });

  it("keeps the next grade closed when move ahead is off", () => {
    const high = placeStrand({ grade: 3, strand: "number", correct: 4, missed: 0, skipped: 0, moveAhead: false });
    expect(high.startSkill).toBe("g3-place");
    expect(high.waitingSkill).toBe("g4-place");
    expect(high.provisionalSkills).toContain("g3-place");
  });

  it("treats skips as not yet learned, and a grade 6 ceiling stays on the current skill", () => {
    const skipped = placeStrand({ grade: 1, strand: "number", correct: 0, missed: 0, skipped: 4, moveAhead: true });
    expect(skipped.rate).toBeNull();
    expect(levelForRate(skipped.rate)).toBe("not_started");
    expect(skipped.startSkill).toBe("g1-place");

    const ceiling = placeStrand({ grade: 6, strand: "data", correct: 3, missed: 0, skipped: 0, moveAhead: true });
    expect(ceiling.startSkill).toBe("g6-data");
    expect(ceiling.provisionalSkills).toEqual(["g5-place"]);
  });

  it("confirms after two solid sets and steps back when one set does not hold", () => {
    expect(confirmSets([0.8])).toBe("wait");
    expect(confirmSets([0.7, 0.8])).toBe("confirmed");
    expect(confirmSets([0.9, 0.6])).toBe("step_back");
    expect(stepBackSkill("g3-add-sub")).toEqual({ skill: "g2-add-sub", note: "Adjusted starting point." });
  });

  it("offers the post check from four weeks on, including after six weeks", () => {
    const start = new Date("2026-01-01T00:00:00Z");
    expect(postIsDue(start, new Date("2026-01-28T00:00:00Z"), false)).toBe(false);
    expect(postIsDue(start, new Date("2026-01-29T00:00:00Z"), false)).toBe(true);
    expect(postIsDue(start, new Date("2026-02-12T00:00:00Z"), false)).toBe(true);
    expect(postIsDue(start, new Date("2026-03-01T00:00:00Z"), true)).toBe(false);
  });

  it("writes a strand delta with no overall score", () => {
    expect(aboutPercent(0.4)).toBe(40);
    expect(aboutPercent(0.85)).toBe(85);
    const delta = strandDelta("Regrouping", 0.4, 0.85);
    expect(delta.text).toBe("Regrouping: about 40% at the start → about 85% now");
    expect(Object.keys(delta)).toEqual(["label", "before", "after", "text"]);
    expect(sampleDeltas().rows[0].text).toBe("Number sense: about 40% at the start → about 85% now");
    expect(sampleMap().rows.map((row) => row.level)).toEqual([
      "Strong",
      "Building",
      "Not started yet",
      "Strong",
      "Strong",
    ]);
    expect(JSON.stringify(sampleMap())).not.toMatch(/%|score/i);
  });

  it("names two or three skills the child already knows, with no grade label", () => {
    const end = sampleEnd();
    expect(end.known).toEqual(["Hundreds", "Telling time", "Bar graphs"]);
    expect(end.starts.length).toBeGreaterThanOrEqual(2);
    expect(end.starts.length).toBeLessThanOrEqual(3);
    expect(`${end.known.join(" ")} ${end.starts.join(" ")}`).not.toMatch(/grade|%/i);
    expect(alreadyKnow(3, [])).toEqual([]);
    expect(startTitles([])).toEqual([]);
  });
});

describe("eval adapt", () => {
  const bank = [
    ref("n1", 3, "number", "g3-place"),
    ref("n2", 3, "number", "g3-place"),
    ref("n3", 3, "number", "g3-place"),
    ref("n4", 4, "number", "g4-place"),
    ref("n5", 4, "number", "g4-place"),
    ref("n0", 2, "number", "g2-place"),
    ref("o1", 3, "operations", "g3-add-sub"),
  ];

  it("skips the rest of a strand after the first two misses or skips and probes one grade down", () => {
    const served: ServedEval[] = [
      { templateId: "n1", strand: "number", skill: "g3-place", grade: 3, role: "core", mark: "missed" },
      { templateId: "n2", strand: "number", skill: "g3-place", grade: 3, role: "core", mark: "not_learned" },
    ];
    const next = nextEvalItem(3, bank, served);
    expect(next).toEqual({ item: bank.find((item) => item.id === "n0"), role: "prereq" });
    const after = nextEvalItem(
      3,
      bank,
      served.concat({ templateId: "n0", strand: "number", skill: "g2-place", grade: 2, role: "prereq", mark: "missed" }),
    );
    expect(after?.item.id).toBe("o1");
  });

  it("keeps going after one miss and adds ceiling questions when the strand is all correct", () => {
    const oneMiss = nextEvalItem(3, bank, [
      { templateId: "n1", strand: "number", skill: "g3-place", grade: 3, role: "core", mark: "missed" },
      { templateId: "n2", strand: "number", skill: "g3-place", grade: 3, role: "core", mark: "correct" },
    ]);
    expect(oneMiss?.item.id).toBe("n3");

    let served: ServedEval[] = bank
      .filter((item) => item.grade === 3 && item.strand === "number")
      .map((item) => ({ templateId: item.id, strand: item.strand, skill: item.skill, grade: item.grade, role: "core" as const, mark: "correct" as const }));
    const first = nextEvalItem(3, bank, served);
    expect(first?.role).toBe("ceiling");
    served = served.concat({
      templateId: first!.item.id,
      strand: "number",
      skill: first!.item.skill,
      grade: 4,
      role: "ceiling",
      mark: "missed",
    });
    const second = nextEvalItem(3, bank, served);
    expect(second?.role).toBe("ceiling");
    expect(second?.item.id).not.toBe(first?.item.id);
  });

  it("has no prerequisite in grade 1 and no ceiling in grade 6", () => {
    const grade1 = [
      ref("a", 1, "data", "g1-count"),
      ref("b", 1, "data", "g1-count"),
    ];
    const shortened = nextEvalItem(1, grade1, [
      { templateId: "a", strand: "data", skill: "g1-count", grade: 1, role: "core", mark: "missed" },
      { templateId: "b", strand: "data", skill: "g1-count", grade: 1, role: "core", mark: "missed" },
    ]);
    expect(shortened).toBeNull();

    const grade6 = [ref("d1", 6, "data", "g6-data"), ref("d2", 6, "data", "g6-data")];
    const ceiling = nextEvalItem(6, grade6, grade6.map((item) => ({
      templateId: item.id, strand: item.strand, skill: item.skill, grade: 6, role: "core" as const, mark: "correct" as const,
    })));
    expect(ceiling).toBeNull();
  });

  it("leaves ceiling misses out of the strand rate and out of mastery", () => {
    const served = [
      { templateId: "n1", strand: "number" as const, skill: "g3-place", grade: 3, role: "core" as const, mark: "correct" as const },
      { templateId: "n2", strand: "number" as const, skill: "g3-place", grade: 3, role: "core" as const, mark: "correct" as const },
      { templateId: "n4", strand: "number" as const, skill: "g4-place", grade: 4, role: "ceiling" as const, mark: "missed" as const },
    ];
    const roll = rollupStrand(served, "number", "g3-place");
    expect(roll).toMatchObject({ itemsAttempted: 2, correct: 2, missed: 0, skippedNotLearned: 0 });
    expect(isMastered({ ...emptyCard("g3-place"), attempted: roll.correct, correct: roll.correct })).toBe(false);
    expect(EVAL_COUNTS_TOWARD_MASTERY).toBe(false);
    const stored = packStoredAnswer("4", [], {
      content: { itemId: null, lane: "core", difficulty: 1, answer: { value: "4" } },
    });
    const evalStored = stored.replace('"lane":"core"', '"lane":"eval"');
    expect(readStoredContent(evalStored)).toBeNull();
  });
});

describe("eval content", () => {
  it("drafts 18 templates for most grades and 20 for grade 3", () => {
    expect(countByGrade()).toEqual({ 1: 18, 2: 18, 3: 20, 4: 18, 5: 18, 6: 18 });
    expect(EVAL_BANK).toHaveLength(110);
    for (const grade of [1, 2, 3, 4, 5, 6] as const) {
      for (const strand of EVAL_STRANDS) {
        const count = EVAL_BANK.filter((item) => item.grade === grade && item.strand === strand).length;
        expect(count).toBeGreaterThanOrEqual(3);
        expect(count).toBeLessThanOrEqual(6);
      }
    }
  });

  it("checks answers, ranges, reading level, and parallel forms", () => {
    const audit = auditEval();
    expect(audit.fills).toBe(110 * 12 * 2);
    expect(audit.failures).toEqual([]);
    expect(audit.reviews.length).toBeGreaterThan(0);
  });

  it("keeps every seeded row a draft and matches the migration", () => {
    const sql = renderEvalSql();
    expect(sql).toContain("lane in ('core', 'go_further', 'review', 'eval')");
    expect(sql).not.toContain("attempts_lane_check");
    expect(sql).not.toMatch(/'published'/);
    expect(sql).toContain("'draft'");
    expect(sql).toContain("'ai_draft'");
    expect(sql).toContain("g5-equations");
    expect(sql).toContain("g6-data");
    for (const [skill, prior] of Object.entries(EVAL_PREREQ)) {
      expect(sql).toContain(`'${skill}', '${prior}'`);
    }
    const curriculum = readFileSync("supabase/migrations/20261018050000_ontario_curriculum.sql", "utf8");
    for (const row of evalRows()) {
      expect(curriculum).toContain(`$txt$${row.skillSlug}$txt$`);
      expect(row.sampleAnswer).toBe(String(row.template.answer(row.sample)));
    }
    expect(readFileSync(migrationPath, "utf8")).toBe(sql);
    const refs = asRefs(EVAL_BANK);
    expect(nextEvalItem(3, refs, [])?.item.grade).toBe(3);
  });

  it("keeps provisionally known skills in review without changing an ordinary turn", () => {
    expect(accuracyScheduler.chooseSkill({ grade: 1, cards: [], sessionCount: 3 }).id).toBe("g1-count");
    expect(
      accuracyScheduler.chooseSkill({
        grade: 1,
        cards: [],
        sessionCount: 3,
        provisionalIds: ["g1-add-10"],
      }).id,
    ).toBe("g1-add-10");
    expect(
      planNextQuestion({
        grade: 1,
        cards: [],
        sessionCount: 3,
        provisionalIds: ["g1-add-10"],
      }).skillId,
    ).toBe("g1-add-10");
  });
});
