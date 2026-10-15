import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";
import { SKILLS } from "@/lib/practice/skills";
import { GRADE_INTROS, ontarioLine, STRANDS, type StrandId } from "@/lib/curriculum/ontario";
import { provinceBySlug, type Province } from "@/lib/curriculum/provinces";

export type CurriculumSkill = {
  id: string;
  title: string;
  line: string;
  prompt: string;
  answer: string;
};

export type CurriculumStrand = {
  id: StrandId;
  label: string;
  skills: CurriculumSkill[];
};

export type CurriculumOverview = {
  province: Province;
  grade: SupportedGrade;
  intro: string;
  strands: CurriculumStrand[];
};

const GRADE_SLUG = /^grade-([1-8])$/;

export function gradeFromSlug(slug: string): SupportedGrade | null {
  const match = GRADE_SLUG.exec(slug);
  if (!match) return null;
  const grade = Number(match[1]);
  return isSupportedGrade(grade) ? grade : null;
}

export function gradeSlug(grade: SupportedGrade): string {
  return `grade-${grade}`;
}

export function curriculumPath(province: string, grade: SupportedGrade): string {
  return `/curriculum/${province}/${gradeSlug(grade)}`;
}

/** A published overview. Unknown routes and provinces without a skill list return null. */
export function curriculumOverview(provinceSlug: string, gradeSlugValue: string): CurriculumOverview | null {
  const province = provinceBySlug(provinceSlug);
  const grade = gradeFromSlug(gradeSlugValue);
  if (!province?.ready || !grade) return null;

  const grouped = new Map<StrandId, CurriculumSkill[]>();
  for (const skill of SKILLS) {
    if (skill.grade !== grade) continue;
    const line = ontarioLine(skill.id);
    if (!line) continue;
    const list = grouped.get(line.strand) ?? [];
    list.push({
      id: skill.id,
      title: skill.title,
      line: line.line,
      prompt: skill.examplePrompt,
      answer: skill.exampleAnswer,
    });
    grouped.set(line.strand, list);
  }

  return {
    province,
    grade,
    intro: GRADE_INTROS[grade],
    strands: STRANDS.flatMap((strand) => {
      const skills = grouped.get(strand.id) ?? [];
      return skills.length > 0 ? [{ ...strand, skills }] : [];
    }),
  };
}
