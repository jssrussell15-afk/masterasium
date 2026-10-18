import { SKILLS } from "@/lib/practice/skills";
import { standardId, type AlignmentRecord, type SkillRecord, type StandardRecord, type StrandRecord } from "@/lib/curriculum/records";

const DOC = "ON-MATH-2020";

export const ONTARIO_STRANDS: StrandRecord[] = [
  ["A", "Social-Emotional Learning (SEL) Skills in Mathematics and the Mathematical Processes"],
  ["B", "Number"],
  ["C", "Algebra"],
  ["D", "Data"],
  ["E", "Spatial Sense"],
  ["F", "Financial Literacy"],
].map(([code, name], index) => ({
  docKey: DOC,
  code,
  codeType: "official" as const,
  name,
  displayOrder: index + 1,
}));

const C4_TEXT =
  "apply the process of mathematical modelling to represent, analyse, make predictions, and provide insight into real-life situations";

type OntarioRow = {
  grade: number;
  strand: string;
  overall: string;
  overall_title: string;
  overall_text: string;
  topic: string;
  code: string;
  code_type: string;
  level: string;
  text: string;
  source_url: string;
  source_pdf: string;
  last_verified: string;
};

type CodeList = { title: string; codes: string[]; grade?: number };

type Correction = {
  grade: number;
  current: string;
  action: string;
  new_title?: string;
  codes?: string[];
  also_add?: CodeList;
  move_to?: CodeList;
  replace_with?: CodeList;
};

function ontarioRank(code: string): number {
  const match = /^([A-F])(\d+)(?:\.(\d+))?$/.exec(code);
  if (!match) return 999999;
  const letter = match[1].charCodeAt(0) - 65;
  const overall = Number(match[2]);
  const specific = match[3] ? Number(match[3]) : 0;
  return letter * 100000 + overall * 1000 + specific;
}

export function importOntarioStandards(rows: OntarioRow[]): StandardRecord[] {
  const byGrade = new Map<number, OntarioRow[]>();
  for (const row of rows) {
    const list = byGrade.get(row.grade) ?? [];
    list.push(row);
    byGrade.set(row.grade, list);
  }

  const standards: StandardRecord[] = [];
  for (const [grade, gradeRows] of [...byGrade.entries()].sort((a, b) => a[0] - b[0])) {
    const drafted: StandardRecord[] = [];
    const seenOverall = new Set<string>();
    for (const row of gradeRows) {
      if (row.level === "overall") {
        drafted.push(makeStandard(grade, row.code, "overall", null, row.text, row, { title: row.overall_title }));
        seenOverall.add(row.code);
        continue;
      }
      if (row.overall && !seenOverall.has(row.overall)) {
        drafted.push(
          makeStandard(grade, row.overall, "overall", null, row.overall_text, row, { title: row.overall_title }),
        );
        seenOverall.add(row.overall);
      }
      drafted.push(
        makeStandard(grade, row.code, "specific", row.overall || null, row.text, row, {
          topic: row.topic,
          source_pdf: row.source_pdf,
        }),
      );
    }
    if (!seenOverall.has("C4")) {
      const sample = gradeRows[0];
      drafted.push(
        makeStandard(grade, "C4", "overall", null, C4_TEXT, sample, { title: "Mathematical Modelling", note: true }),
      );
    }
    drafted.sort((a, b) => ontarioRank(a.code) - ontarioRank(b.code) || a.code.localeCompare(b.code));
    drafted.forEach((standard, index) => {
      standard.displayOrder = index + 1;
    });
    standards.push(...drafted);
  }
  return standards;
}

function makeStandard(
  grade: number,
  code: string,
  level: "overall" | "specific",
  parentCode: string | null,
  text: string,
  row: OntarioRow,
  extra: Record<string, unknown>,
): StandardRecord {
  return {
    id: standardId(DOC, grade, code),
    docKey: DOC,
    grade,
    code,
    codeType: "official",
    level,
    parentCode,
    text,
    extra,
    sourceSystemId: null,
    sourceUrl: row.source_url,
    displayOrder: 0,
    needsReview: false,
    lastVerified: row.last_verified,
    strandCode: code[0] ?? row.strand,
  };
}

const practiceByGradeTitle = new Map(SKILLS.map((skill) => [`${skill.grade}|${skill.title}`, skill]));

function skillFromPractice(grade: number, current: string, title: string, fallbackSlug: string): SkillRecord {
  const practice = practiceByGradeTitle.get(`${grade}|${current}`);
  return {
    slug: practice?.id ?? fallbackSlug,
    title,
    description: practice?.summary ?? null,
    practiceId: practice?.id ?? null,
  };
}

function freshSkill(slug: string, title: string): SkillRecord {
  return { slug, title, description: null, practiceId: null };
}

export function importOntarioSkills(corrections: Correction[]): { skills: SkillRecord[]; alignments: AlignmentRecord[] } {
  const skills: SkillRecord[] = [];
  const alignments: AlignmentRecord[] = [];
  const seen = new Set<string>();

  const add = (skill: SkillRecord, grade: number, codes: string[]) => {
    if (!seen.has(skill.slug)) {
      skills.push(skill);
      seen.add(skill.slug);
    } else {
      const existing = skills.find((item) => item.slug === skill.slug);
      if (existing) existing.title = skill.title;
    }
    for (const code of codes) {
      alignments.push({ skillSlug: skill.slug, docKey: DOC, grade, code, strength: "primary", note: null });
    }
  };

  for (const row of corrections) {
    if (row.action === "delete") {
      if (row.replace_with) add(freshSkill(slugify(row.replace_with.title), row.replace_with.title), row.grade, row.replace_with.codes);
      continue;
    }
    if (row.action === "merge") {
      add(freshSkill("g7-cylinder-surface", "Surface area of cylinders"), 7, ["E2.6"]);
      continue;
    }
    if (row.action === "split") {
      add(skillFromPractice(row.grade, row.current, row.new_title ?? row.current, slugify(row.new_title ?? row.current)), row.grade, row.codes ?? []);
      if (row.also_add) add(freshSkill("g3-represent-arrays", row.also_add.title), row.grade, row.also_add.codes);
      if (row.move_to) add(freshSkill("g4-facts-10x10", row.move_to.title), row.move_to.grade ?? 4, row.move_to.codes);
      continue;
    }
    if (row.action === "move_grade" && row.move_to) {
      add(
        skillFromPractice(row.grade, row.current, row.move_to.title, slugify(row.move_to.title)),
        row.move_to.grade ?? row.grade,
        row.move_to.codes,
      );
      if (row.replace_with) add(freshSkill(slugify(row.replace_with.title), row.replace_with.title), row.grade, row.replace_with.codes);
      continue;
    }
    add(
      skillFromPractice(row.grade, row.current, row.new_title ?? row.current, slugify(row.new_title ?? row.current)),
      row.grade,
      row.codes ?? [],
    );
  }

  return { skills, alignments };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/×/g, "x")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}
