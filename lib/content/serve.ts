import type { SupabaseClient } from "@supabase/supabase-js";
import { fillTemplate, runChecker, servableItems, type ContentItem, type ContentTemplate, type Lane } from "@/lib/content/model";
import type { Question } from "@/lib/practice/types";

type SkillEmbed = { slug?: string } | { slug?: string }[] | null;

type ItemRow = {
  id: string;
  question_type: ContentItem["questionType"];
  lane: Lane;
  difficulty: ContentItem["difficulty"];
  template: ContentTemplate;
  checker: ContentItem["checker"];
  status: ContentItem["status"];
  source: ContentItem["source"];
  reviewer_id: string | null;
  reviewed_at: string | null;
  version: number;
  skill: SkillEmbed;
};

function skillSlug(skill: SkillEmbed): string {
  if (!skill) return "";
  if (Array.isArray(skill)) return skill[0]?.slug ?? "";
  return skill.slug ?? "";
}

export function rowToItem(row: ItemRow): ContentItem {
  return {
    id: row.id,
    skillSlug: skillSlug(row.skill),
    questionType: row.question_type,
    lane: row.lane,
    difficulty: row.difficulty,
    template: row.template,
    checker: row.checker,
    status: row.status,
    source: row.source,
    reviewerId: row.reviewer_id,
    reviewedAt: row.reviewed_at,
    version: row.version,
  };
}

/**
 * A published row for this skill and lane, or null.
 * A missing table, a draft, or a checker that rejects its own answer returns null
 * so practice keeps using the code generator.
 */
export async function findPublishedItem(
  supabase: SupabaseClient,
  skillSlugWanted: string,
  lane: Extract<Lane, "core" | "review">,
): Promise<ContentItem | null> {
  try {
    const { data, error } = await supabase
      .from("content_items")
      .select(
        "id, question_type, lane, difficulty, template, checker, status, source, reviewer_id, reviewed_at, version, skill:skill_id(slug)",
      )
      .eq("status", "published")
      .eq("lane", lane)
      .limit(40);
    if (error || !Array.isArray(data)) return null;
    const items = servableItems((data as ItemRow[]).map(rowToItem)).filter(
      (item) => item.skillSlug === skillSlugWanted && item.lane === lane,
    );
    const item = items[0];
    if (!item) return null;
    const filled = fillTemplate(item.template);
    if (!runChecker(item.checker, item.template, filled.answer).ok) return null;
    return item;
  } catch {
    return null;
  }
}

export function questionFromItem(skillId: string, item: ContentItem, responseHint: string | null): Question {
  const filled = fillTemplate(item.template);
  return {
    skillId,
    prompt: filled.prompt,
    answer: filled.answer,
    steps: item.template.steps ?? [],
    responseHint,
  };
}
