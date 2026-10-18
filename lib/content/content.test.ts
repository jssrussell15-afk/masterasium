import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MISCONCEPTIONS, misconceptionByTag } from "@/lib/content/misconceptions";
import {
  decideItem,
  fillTemplate,
  filterItems,
  flagReason,
  numbersIn,
  previewItem,
  reviseItem,
  runChecker,
  servableItems,
} from "@/lib/content/model";
import { GRADE_3_PREREQUISITES } from "@/lib/content/prerequisites";
import { SAMPLE_ITEMS } from "@/lib/content/samples";
import { skillById } from "@/lib/practice/skills";
import { placeToStop, setLengthMinutes } from "@/lib/practice/set-length";

const sql = readFileSync(new URL("../../supabase/migrations/20261018164025_content_store.sql", import.meta.url), "utf8");

describe("content store", () => {
  it("serves published rows only", () => {
    expect(servableItems(SAMPLE_ITEMS).map((item) => item.id)).toEqual(["item-mult"]);
    expect(servableItems(SAMPLE_ITEMS).every((item) => item.status === "published")).toBe(true);
  });

  it("starts a new draft version on edit and keeps a mastered publish off the list", () => {
    const draft = SAMPLE_ITEMS[0]!;
    const revised = reviseItem(draft, { ...draft.template, prompt: "{a} + {b} = ?" });
    expect(revised.id).toBe(draft.id);
    expect(revised.version).toBe(draft.version + 1);
    expect(revised.status).toBe("draft");
    expect(revised.reviewerId).toBeNull();
    expect(servableItems([revised])).toEqual([]);

    const published = SAMPLE_ITEMS[1]!;
    const edited = reviseItem(published, published.template);
    expect(edited.status).toBe("draft");
    expect(edited.version).toBe(published.version + 1);
    expect(servableItems([edited])).toEqual([]);
  });

  it("records an approval against the current version and then serves the item", () => {
    const draft = SAMPLE_ITEMS[0]!;
    const { item, review } = decideItem(draft, "approve", "parent-1", "2026-10-18T16:00:00.000Z", "Looks right.");
    expect(item.status).toBe("published");
    expect(review.version).toBe(draft.version);
    expect(review.decision).toBe("approve");
    expect(servableItems([item]).map((row) => row.id)).toEqual([draft.id]);

    const held = decideItem(item, "request_changes", "parent-1", "2026-10-18T16:01:00.000Z");
    expect(held.item.status).toBe("draft");
    expect(servableItems([held.item])).toEqual([]);

    const retired = decideItem(item, "retire", "parent-1", "2026-10-18T16:02:00.000Z");
    expect(retired.item.status).toBe("retired");
    expect(servableItems([retired.item])).toEqual([]);
  });

  it("runs the checker on the sample numbers in a preview", () => {
    const item = SAMPLE_ITEMS[0]!;
    const preview = previewItem(item);
    expect(preview.prompt).toBe("46 + 27 = ?");
    expect(preview.answer).toBe("73");
    expect(preview.ok).toBe(true);
    expect(preview.note).toBe("That matches.");
    expect(runChecker(item.checker, item.template, "72").ok).toBe(false);
    expect(fillTemplate(item.template).prompt).not.toContain("{");
  });

  it("filters the review list", () => {
    const further = filterItems(SAMPLE_ITEMS, {
      skill: "g3-add-sub",
      questionType: "",
      lane: "go_further",
      difficulty: "",
      status: "",
      source: "",
    });
    expect(further.map((item) => item.id)).toEqual(["item-further"]);
  });

  it("links explanation and Show me tags to a misconception", () => {
    expect(misconceptionByTag("forgot_carried_ten")?.surfaces).toContain("explanation");
    expect(misconceptionByTag("forgot_carried_ten")?.surfaces).toContain("show-me");
    expect(misconceptionByTag("counted_tick_marks_not_spaces")?.skillSlug).toBe("g3-fractions");
    for (const item of MISCONCEPTIONS) {
      expect(skillById(item.skillSlug)).toBeDefined();
      expect(item.description.length).toBeGreaterThan(10);
    }
    expect(MISCONCEPTIONS.map((item) => item.id)).toEqual([
      "forgot_carried_ten",
      "compared_digits_not_place_value",
      "added_instead_of_grouped",
      "counted_tick_marks_not_spaces",
      "treated_equals_as_answer_here",
      "hour_stays_past_sixty",
    ]);
  });

  it("seeds Grade 3 skills with an obvious Grade 2 prerequisite", () => {
    for (const pair of GRADE_3_PREREQUISITES) {
      expect(skillById(pair.skillSlug)?.grade).toBe(3);
      expect(skillById(pair.prerequisiteSlug)?.grade).toBe(2);
    }
    expect(GRADE_3_PREREQUISITES.map((pair) => pair.skillSlug)).toEqual([
      "g3-place",
      "g3-add-sub",
      "g3-mult",
      "g3-fractions",
    ]);
  });

  it("keeps a flag reason short", () => {
    expect(flagReason("The numbers look wrong", "")).toBe("The numbers look wrong");
    expect(flagReason("Something else", "The 6 looks like an 8.")).toBe("The 6 looks like an 8.");
    expect(flagReason("Something else", "  ")).toBeNull();
    expect(numbersIn("True or false? 8 × 5 = 4 × 10")).toEqual(["8", "5", "4", "10"]);
  });

  it("says it is a good place to stop only after the chosen length", () => {
    expect(setLengthMinutes("nope")).toBe(15);
    expect(placeToStop(14 * 60, 15)).toBe(false);
    expect(placeToStop(15 * 60, 15)).toBe(true);
    expect(placeToStop(10 * 60, 10)).toBe(true);
    expect(placeToStop(9 * 60, 10)).toBe(false);
  });
});

describe("content store migration", () => {
  it("keeps published reads open and flag reads closed", () => {
    expect(sql).toContain("references public.skill (id)");
    expect(sql).toContain("using (status = 'published')");
    expect(sql).toContain('create policy "students insert flags"');
    expect(sql).toContain('create policy "parents insert flags"');
    expect(sql).toContain('create policy "admins read flags"');
    expect(sql).not.toMatch(/content_flags for select\s+to anon/);
    expect(sql).toContain("grant insert on public.content_flags to anon, authenticated");
    expect(sql).toContain("grant select on public.content_items to anon, authenticated");
    expect(sql).not.toContain("grant execute on function public.set_practice_length(uuid, integer) to anon");
    expect(sql).toContain("security definer");
    expect(sql).toContain("set search_path = public");
    expect(sql).toContain("revoke all on function public.set_practice_length(uuid, integer) from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.set_practice_length(uuid, integer) to authenticated");
    expect(sql).toContain("add column if not exists lane text");
    expect(sql).toContain("content_item_id uuid");
    expect(sql).toContain("answer jsonb");
    expect(sql).not.toContain("add column if not exists move_ahead");
    for (const name of ["content_items", "content_reviews", "content_flags", "misconceptions", "skill_prerequisites", "admins"]) {
      expect(sql).toContain(`alter table public.${name} enable row level security`);
    }
  });
});
