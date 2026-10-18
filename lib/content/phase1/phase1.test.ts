import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildSundayDigest, renderSundayDigestText, sendSundayDigest, type SundayDigest } from "@/lib/digest/sunday";
import { previewItem, runChecker, servableItems } from "@/lib/content/model";
import { attentionItems, buildPhase1, FILLS_PER_DIFFICULTY } from "@/lib/content/phase1/catalog";
import { HAND_PUZZLES } from "@/lib/content/phase1/puzzles";
import { renderPhase1Sql } from "@/lib/content/phase1/sql";
import { PHASE1_TEMPLATES } from "@/lib/content/phase1/templates";
import { WEEKLY_PUZZLES, weeklyForDate } from "@/lib/content/phase1/weekly";
import { closestLabel, countFactorPairs, countSolutions, satisfies } from "@/lib/content/rules";
import { readability } from "@/lib/content/readability";

describe("phase 1 drafts", () => {
  const catalog = buildPhase1();

  it("keeps the planned counts and leaves every row a draft", () => {
    expect(PHASE1_TEMPLATES).toHaveLength(40);
    expect(HAND_PUZZLES).toHaveLength(15);
    expect(WEEKLY_PUZZLES).toHaveLength(4);
    expect(FILLS_PER_DIFFICULTY).toBeGreaterThanOrEqual(30);
    expect(catalog.rows).toHaveLength(40 * 3 + 15 + 4);
    expect(new Set(catalog.rows.map((row) => row.id)).size).toBe(catalog.rows.length);
    expect(catalog.rows.every((row) => row.status === "draft" && row.source === "ai_draft" && row.lane === "go_further")).toBe(
      true,
    );
    expect(servableItems(catalog.rows)).toEqual([]);
    expect(catalog.review).toEqual([]);
  });

  it("checks a sample answer with the same checker the row stores", () => {
    for (const row of catalog.rows) {
      const preview = previewItem(row);
      expect(preview.ok, row.templateId).toBe(true);
      expect(runChecker(row.checker, row.template, "nope").ok, row.templateId).toBe(false);
    }
  });

  it("pins a few answers the checker must keep", () => {
    expect(satisfies("sum-diff", { sum: 50, diff: 12 }, "31 and 19")).toBe(true);
    expect(satisfies("sum-diff", { sum: 50, diff: 12 }, "19 and 31")).toBe(true);
    expect(countSolutions("sum-diff", { sum: 50, diff: 12 })).toBe(1);
    expect(countFactorPairs(20, 2, 5)).toBe(1);
    expect(closestLabel(1, 8)).toBe("0");
    expect(closestLabel(3, 8)).toBe("1/2");
    expect(closestLabel(7, 8)).toBe("1");
    expect(closestLabel(1, 4)).toBeNull();
  });

  it("finds one solution for every hand puzzle and weekly draft", () => {
    for (const puzzle of HAND_PUZZLES) {
      expect(puzzle.solve(), puzzle.id).toEqual([puzzle.answer]);
      expect(readability(puzzle.prompt).issues, puzzle.id).toEqual([]);
    }
    for (const weekly of WEEKLY_PUZZLES) {
      expect(weekly.solve(), weekly.title).toEqual([weekly.answer]);
      expect(readability(`${weekly.prompt} ${weekly.hint}`).issues, weekly.title).toEqual([]);
    }
  });

  it("writes the migration as drafts only", () => {
    const sql = readFileSync(
      new URL("../../../supabase/migrations/20261018170023_phase1_go_further_drafts.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toBe(renderPhase1Sql(catalog.rows));
    expect(sql).not.toContain("'published'");
    expect(sql).toContain("'draft'");
    expect(sql).toContain("'ai_draft'");
    expect(sql).toContain("'conditions'");
    expect(sql).toContain("'mistake-line'");
    for (const row of catalog.rows) expect(sql).toContain(row.id);
  });

  it("adds the weekly puzzle to the Sunday note without sending it", () => {
    const weekly = weeklyForDate("2026-10-18");
    const digest: SundayDigest = {
      ...buildSundayDigest("Sam", {
        learned: [],
        needsHelp: [],
        ask: { solved: null, repaired: null },
        upcoming: [],
      }),
      weeklyTitle: weekly.title,
      weeklyHref: "/weekly?week=1",
    };
    const text = renderSundayDigestText(digest);
    expect(weekly.week).toBe(1);
    expect(text).toContain("This week's puzzle");
    expect(text).toContain("/weekly?week=1");
    expect(text.toLowerCase()).not.toMatch(/streak|badge|you win|confetti/);
    expect(sendSundayDigest(digest)).toBeUndefined();
  });

  it("lists human attention separately from checker failures", () => {
    const notes = attentionItems();
    expect(notes.length).toBeGreaterThan(10);
    expect(notes.every((note) => note.note.length > 10)).toBe(true);
  });
});
