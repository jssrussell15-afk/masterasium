import { getCatalog } from "@/lib/curriculum/catalog";
import { currentDocKey, todayIso } from "@/lib/curriculum/documents";
import { jurisdictionByCode, jurisdictionBySlug } from "@/lib/curriculum/jurisdictions";
import { STRANDS, ontarioLine, type StrandId } from "@/lib/curriculum/ontario";
import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";
import { isMastered, type SkillCard } from "@/lib/practice/scheduler";
import { skillById, skillsForGrade, type Skill } from "@/lib/practice/skills";

/**
 * The practice profile does not store a province yet.
 * Callers pass one. Ontario is the sequence the practice skills are written for.
 */
export const DEFAULT_PRACTICE_PROVINCE = "ON";

export const MOVE_AHEAD_LABEL = "Let them move ahead";
export const MOVE_AHEAD_NOTE = "When a strand is solid, the next skills in that strand can open.";

export type WeekReview = {
  skillId: string;
  passed: boolean;
};

export type NextUpSkill = {
  id: string;
  title: string;
  note: "Next up";
};

export function strandSkills(grade: SupportedGrade, strand: StrandId): Skill[] {
  return skillsForGrade(grade).filter((skill) => ontarioLine(skill.id)?.strand === strand);
}

/** Every skill in the strand is at 80% over 10 questions, and its 1-week review is done. */
export function strandIsSolid(input: {
  grade: SupportedGrade;
  strand: StrandId;
  cards: readonly SkillCard[];
  weekPassed: ReadonlySet<string>;
}): boolean {
  const skills = strandSkills(input.grade, input.strand);
  if (skills.length === 0) return false;
  return skills.every((skill) => {
    const card = input.cards.find((item) => item.skillId === skill.id);
    return isMastered(card) && input.weekPassed.has(skill.id);
  });
}

export function nextStrandSkills(input: { province: string; grade: SupportedGrade; strand: StrandId }): Skill[] {
  const next = input.grade + 1;
  if (!isSupportedGrade(next)) return [];
  return orderForProvince(input.province, next, strandSkills(next, input.strand));
}

/**
 * Skills from the next grade that the child may see.
 * Off, or a strand that is not solid: nothing new opens.
 * Skills already mastered stay visible after the setting is turned off.
 */
export function openNextUp(input: {
  moveAhead: boolean;
  province: string;
  grade: SupportedGrade;
  cards: readonly SkillCard[];
  weekPassed: readonly WeekReview[];
}): NextUpSkill[] {
  const next = input.grade + 1;
  if (!isSupportedGrade(next)) return [];

  const passed = new Set(input.weekPassed.filter((review) => review.passed).map((review) => review.skillId));
  const opened = new Set<string>();

  for (const skill of skillsForGrade(next)) {
    const card = input.cards.find((item) => item.skillId === skill.id);
    if (isMastered(card)) opened.add(skill.id);
  }

  if (input.moveAhead) {
    for (const strand of STRANDS) {
      if (!strandIsSolid({ grade: input.grade, strand: strand.id, cards: input.cards, weekPassed: passed })) continue;
      for (const skill of nextStrandSkills({ province: input.province, grade: input.grade, strand: strand.id })) {
        opened.add(skill.id);
      }
    }
  }

  return skillsForGrade(next).flatMap((skill) => {
    if (!opened.has(skill.id)) return [];
    return [{ id: skill.id, title: skill.title, note: "Next up" as const }];
  });
}

function orderForProvince(province: string, grade: SupportedGrade, skills: Skill[]): Skill[] {
  const resolved = practiceAt(province, grade);
  if (!resolved.published) return [];
  const pool = resolved.ids.size > 0 ? skills.filter((skill) => resolved.ids.has(skill.id)) : skills;
  const rank = sequenceRank(resolved.code, grade);
  return [...pool].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank != null && rightRank != null && leftRank !== rightRank) return leftRank - rightRank;
    if (leftRank != null && rightRank == null) return -1;
    if (leftRank == null && rightRank != null) return 1;
    return left.order - right.order;
  });
}

function practiceAt(province: string, grade: number): { code: string; published: boolean; ids: Set<string> } {
  const jurisdiction = jurisdictionByCode(province) ?? jurisdictionBySlug(province);
  if (!jurisdiction || jurisdiction.publishStatus !== "published") {
    return { code: "", published: false, ids: new Set() };
  }
  const docKey = currentDocKey(jurisdiction.code, grade, todayIso());
  if (!docKey) return { code: jurisdiction.code, published: false, ids: new Set() };
  const catalog = getCatalog();
  const ids = new Set<string>();
  for (const alignment of catalog.alignments) {
    if (alignment.docKey !== docKey || alignment.grade !== grade) continue;
    const record = catalog.skills.find((skill) => skill.slug === alignment.skillSlug);
    const practiceId = record?.practiceId ?? (skillById(alignment.skillSlug) ? alignment.skillSlug : null);
    if (practiceId && skillById(practiceId)) ids.add(practiceId);
  }
  return { code: jurisdiction.code, published: true, ids };
}

function sequenceRank(code: string, grade: number): Map<string, number> {
  const catalog = getCatalog();
  const sequence = catalog.sequences.find(
    (item) => item.jurisdiction === code && item.grade === grade && item.isPublished,
  );
  const rank = new Map<string, number>();
  if (!sequence) return rank;
  catalog.sequenceItems.forEach((item, index) => {
    if (!item.skillSlug || rank.has(item.skillSlug)) return;
    rank.set(item.skillSlug, index);
  });
  return rank;
}
