import { SKILLS } from "@/lib/practice/skills";
import { GRADE_INTROS } from "@/lib/curriculum/ontario";
import { getCatalog } from "@/lib/curriculum/catalog";
import { currentDocKey, docByKey, todayIso } from "@/lib/curriculum/documents";
import { jurisdictionByCode, jurisdictionBySlug, type Jurisdiction } from "@/lib/curriculum/jurisdictions";
import type { SkillRecord, StandardRecord, StrandRecord } from "@/lib/curriculum/records";
import { SHOW_COMING_SOON_PILLS } from "@/lib/curriculum/config";
import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";

const practiceById = new Map(SKILLS.map((skill) => [skill.id, skill]));

export type ChipModel = {
  code: string;
  codeType: "official" | "derived";
  label: string;
  derived: boolean;
  text: string | null;
  sourceUrl: string;
  extraLines: { heading: string; items: string[] }[];
  processes: { code: string; label: string }[];
};

export type PageItem = {
  key: string;
  kind: "skill" | "expectation" | "note" | "subhead" | "group";
  title: string;
  chips: ChipModel[];
  tag: "Practice coming soon" | "Being checked" | null;
  practice: { id: string; prompt: string; answer: string } | null;
};

export type PageStrand = {
  code: string;
  heading: string;
  items: PageItem[];
};

export type SequenceBlock = {
  position: number;
  title: string;
  approxWeeks: number | null;
  main: PageItem[];
  review: PageItem[];
  comingSoon: PageItem[];
  keepPractising: ChipModel[];
};

export type GradePage = {
  jurisdiction: Jurisdiction;
  grade: SupportedGrade;
  docKey: string;
  docTitle: string;
  lastVerified: string;
  footerNote: string | null;
  banner: string | null;
  follows: string | null;
  intro: string;
  gradeNote: string | null;
  strands: PageStrand[];
  sequence: {
    label: string;
    disclaimer: string;
    blocks: SequenceBlock[];
  } | null;
  publishedGrades: SupportedGrade[];
};

const PROCESS_LEGEND: Record<string, string> = {
  C: "Communication",
  CN: "Connections",
  ME: "Mental Mathematics and Estimation",
  PS: "Problem Solving",
  R: "Reasoning",
  T: "Technology",
  V: "Visualization",
};

const GRADE_SLUG = /^grade-([1-8])$/;

export function gradeFromSlug(slug: string): SupportedGrade | null {
  const match = GRADE_SLUG.exec(slug);
  if (!match) return null;
  const grade = Number(match[1]);
  return isSupportedGrade(grade) ? grade : null;
}

export function standardsFor(docKey: string, grade: number): StandardRecord[] {
  return getCatalog().standards.filter((standard) => standard.docKey === docKey && standard.grade === grade);
}

export function isGradePublished(code: string, grade: number, on = todayIso()): boolean {
  const jurisdiction = jurisdictionByCode(code);
  if (!jurisdiction || jurisdiction.publishStatus !== "published") return false;
  const docKey = currentDocKey(code, grade, on);
  if (!docKey) return false;
  return standardsFor(docKey, grade).length > 0;
}

export function publishedGrades(code: string, on = todayIso()): SupportedGrade[] {
  const grades: SupportedGrade[] = [];
  for (let grade = 1; grade <= 8; grade += 1) {
    if (isSupportedGrade(grade) && isGradePublished(code, grade, on)) grades.push(grade);
  }
  return grades;
}

export function lowestPublishedGrade(code: string, on = todayIso()): SupportedGrade | null {
  return publishedGrades(code, on)[0] ?? null;
}

export function hasPublishedSequence(code: string, grade: number, on = todayIso()): boolean {
  const docKey = currentDocKey(code, grade, on);
  if (!docKey) return false;
  return getCatalog().sequences.some(
    (sequence) =>
      sequence.jurisdiction === code &&
      sequence.grade === grade &&
      sequence.docKey === docKey &&
      sequence.isPublished &&
      sequence.effectiveFrom <= on &&
      (sequence.effectiveTo == null || sequence.effectiveTo >= on),
  );
}

export function pillProvinces(showComingSoon = SHOW_COMING_SOON_PILLS): Jurisdiction[] {
  return getCatalog()
    .jurisdictions
    .filter((item) => item.publishStatus !== "hidden")
    .filter((item) => showComingSoon || item.publishStatus === "published")
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

export function provinceHref(target: Jurisdiction, currentGrade: number, view: string | null, on = todayIso()): string {
  const grades = publishedGrades(target.code, on);
  const grade = grades.includes(currentGrade as SupportedGrade) ? currentGrade : grades[0];
  const params = new URLSearchParams();
  if (view === "sequence" && hasPublishedSequence(target.code, grade, on)) params.set("view", "sequence");
  if (grade !== currentGrade) params.set("from", String(currentGrade));
  const query = params.toString();
  return `/curriculum/${target.slug}/grade-${grade}${query ? `?${query}` : ""}`;
}

export function gradeHref(slug: string, grade: number, view: string | null): string {
  const params = new URLSearchParams();
  if (view) params.set("view", view);
  const query = params.toString();
  return `/curriculum/${slug}/grade-${grade}${query ? `?${query}` : ""}`;
}

export function loadGradePage(slug: string, grade: SupportedGrade, fromGrade: number | null, on = todayIso()): GradePage | null {
  const jurisdiction = jurisdictionBySlug(slug);
  if (!jurisdiction || jurisdiction.publishStatus !== "published") return null;
  if (!isGradePublished(jurisdiction.code, grade, on)) return null;
  const docKey = currentDocKey(jurisdiction.code, grade, on);
  const doc = docKey ? docByKey(docKey) : undefined;
  if (!docKey || !doc) return null;
  const strands = strandView(jurisdiction.code, grade, docKey);
  const sequence = sequenceView(jurisdiction.code, grade, docKey, on);
  const showingFallback = fromGrade != null && fromGrade !== grade && !isGradePublished(jurisdiction.code, fromGrade, on);
  return {
    jurisdiction,
    grade,
    docKey,
    docTitle: doc.title,
    lastVerified: doc.lastVerified,
    footerNote:
      docKey === "AB-MATH-K6-2022"
        ? "Alberta revised parts of this curriculum; content checked 2026-10-17."
        : null,
    banner:
      jurisdiction.code === "AB" && docKey === "AB-MATH-K9-2016"
        ? "Alberta is replacing this Grade 7-8 math curriculum. This page follows the 2016 program, in force until August 2027."
        : null,
    follows: jurisdiction.code === "YT" ? "Yukon follows the British Columbia curriculum." : null,
    intro: jurisdiction.code === "ON" ? GRADE_INTROS[grade] : `Grade ${grade} mathematics in ${jurisdiction.name}.`,
    gradeNote: showingFallback
      ? `Grade ${fromGrade} isn't available for ${jurisdiction.name} yet. Showing Grade ${grade}.`
      : null,
    strands,
    sequence,
    publishedGrades: publishedGrades(jurisdiction.code, on),
  };
}

function strandView(code: string, grade: number, docKey: string): PageStrand[] {
  const catalog = getCatalog();
  const strands = catalog.strands
    .filter((strand) => strand.docKey === docKey)
    .sort((a, b) => a.displayOrder - b.displayOrder);
  const standards = standardsFor(docKey, grade).sort((a, b) => a.displayOrder - b.displayOrder);
  const alignments = catalog.alignments.filter((alignment) => alignment.docKey === docKey && alignment.grade === grade);
  return strands.map((strand) => ({
    code: strand.code,
    heading: strandHeading(strand),
    items: itemsForStrand(code, strand, standards.filter((standard) => standard.strandCode === strand.code), alignments),
  }));
}

function strandHeading(strand: StrandRecord): string {
  if (strand.code.length <= 3) return `${strand.code}. ${strand.name}`;
  return strand.name;
}

function itemsForStrand(
  _code: string,
  strand: StrandRecord,
  standards: StandardRecord[],
  alignments: { skillSlug: string; code: string }[],
): PageItem[] {
  const catalog = getCatalog();
  const skillsByCode = new Map<string, SkillRecord[]>();
  for (const alignment of alignments) {
    const skill = catalog.skills.find((item) => item.slug === alignment.skillSlug);
    if (!skill) continue;
    const list = skillsByCode.get(alignment.code) ?? [];
    if (!list.some((item) => item.slug === skill.slug)) list.push(skill);
    skillsByCode.set(alignment.code, list);
  }
  if (strand.docKey === "ON-MATH-2020") return ontarioItems(standards, skillsByCode);
  if (strand.code === "competency") return groupedStandards(standards, skillsByCode);
  return standards.map((standard) => standardItem(standard, skillsByCode.get(standard.code) ?? []));
}

function ontarioItems(standards: StandardRecord[], skillsByCode: Map<string, SkillRecord[]>): PageItem[] {
  const items: PageItem[] = [];
  const emitted = new Set<string>();
  for (const standard of standards) {
    if (standard.code === "A1") {
      items.push({
        key: standard.id,
        kind: "note",
        title: `Throughout the year. ${standard.text}`,
        chips: [chipFor(standard)],
        tag: null,
        practice: null,
      });
      continue;
    }
    if (standard.code === "C4") {
      items.push({
        key: standard.id,
        kind: "note",
        title: `${standard.extra.title}: ${standard.text}`,
        chips: [chipFor(standard)],
        tag: null,
        practice: null,
      });
      continue;
    }
    if (standard.level === "overall") {
      const title = typeof standard.extra.title === "string" ? standard.extra.title : standard.text;
      items.push({ key: standard.id, kind: "subhead", title: `${standard.code} ${title}`, chips: [], tag: null, practice: null });
      continue;
    }
    const skills = skillsByCode.get(standard.code) ?? [];
    if (skills.length === 0) {
      items.push(expectationItem(standard));
      continue;
    }
    for (const skill of skills) {
      if (emitted.has(skill.slug)) continue;
      emitted.add(skill.slug);
      items.push(skillItem(skill, standards));
    }
  }
  return items;
}

function skillItem(skill: SkillRecord, standards: StandardRecord[]): PageItem {
  const catalog = getCatalog();
  const codes = catalog.alignments
    .filter((alignment) => alignment.skillSlug === skill.slug && alignment.docKey === standards[0]?.docKey && alignment.grade === standards[0]?.grade)
    .map((alignment) => alignment.code);
  const chips = codes
    .map((code) => standards.find((standard) => standard.code === code))
    .filter((standard): standard is StandardRecord => Boolean(standard))
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(chipFor);
  const practice = skill.practiceId ? practiceById.get(skill.practiceId) : undefined;
  return {
    key: skill.slug,
    kind: "skill",
    title: skill.title,
    chips,
    tag: null,
    practice: practice
      ? { id: practice.id, prompt: practice.examplePrompt, answer: practice.exampleAnswer }
      : null,
  };
}

function expectationItem(standard: StandardRecord): PageItem {
  if (standard.needsReview) {
    return {
      key: standard.id,
      kind: "expectation",
      title: "Being checked",
      chips: [{ ...chipFor(standard), text: null }],
      tag: "Being checked",
      practice: null,
    };
  }
  return {
    key: standard.id,
    kind: "expectation",
    title: standard.text,
    chips: [chipFor(standard)],
    tag: "Practice coming soon",
    practice: null,
  };
}

function standardItem(standard: StandardRecord, skills: SkillRecord[]): PageItem {
  if (standard.needsReview) return expectationItem(standard);
  return {
    key: standard.id,
    kind: skills.length > 0 ? "skill" : "expectation",
    title: standard.text,
    chips: [chipFor(standard)],
    tag: skills.length > 0 ? null : "Practice coming soon",
    practice: null,
  };
}

function groupedStandards(standards: StandardRecord[], skillsByCode: Map<string, SkillRecord[]>): PageItem[] {
  const order = ["Reasoning and analyzing", "Understanding and solving", "Communicating and representing", "Connecting and reflecting"];
  const groups = new Map<string, StandardRecord[]>();
  for (const standard of standards) {
    const name = typeof standard.extra.group === "string" && standard.extra.group ? standard.extra.group : "Curricular competencies";
    const list = groups.get(name) ?? [];
    list.push(standard);
    groups.set(name, list);
  }
  const names = [...groups.keys()].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const items: PageItem[] = [];
  for (const name of names) {
    items.push({ key: `group-${name}`, kind: "group", title: name, chips: [], tag: null, practice: null });
    for (const standard of groups.get(name) ?? []) items.push(standardItem(standard, skillsByCode.get(standard.code) ?? []));
  }
  return items;
}

export function chipFor(standard: StandardRecord): ChipModel {
  const catalog = getCatalog();
  const strand = catalog.strands.find((item) => item.docKey === standard.docKey && item.code === standard.strandCode);
  const derived = standard.codeType === "derived";
  return {
    code: standard.code,
    codeType: standard.codeType,
    label: chipLabel(standard, strand?.name ?? ""),
    derived,
    text: standard.needsReview ? null : standard.text,
    sourceUrl: standard.sourceUrl,
    extraLines: extraLines(standard),
    processes: processTags(standard),
  };
}

function chipLabel(standard: StandardRecord, strandName: string): string {
  if (!standard.codeType || standard.codeType === "official") return standard.code;
  const suffix = /(\d+)$/.exec(standard.code);
  const n = suffix ? String(Number(suffix[1])) : "";
  if (standard.docKey === "BC-MATH-K9-2016") {
    if (standard.level === "content") return `Content ${n}`;
    if (standard.level === "competency") return `Competency ${n}`;
    if (standard.level === "big_idea") return `Big idea ${n}`;
  }
  if (standard.docKey === "AB-MATH-K6-2022") return `${strandName} outcome ${n}`;
  if (standard.docKey === "AB-MATH-K9-2016") {
    const official = standard.extra.official_number;
    return `${strandName} SO ${official ?? n}`;
  }
  return standard.code;
}

function extraLines(standard: StandardRecord): { heading: string; items: string[] }[] {
  const lines: { heading: string; items: string[] }[] = [];
  const elaboration = standard.extra.elaboration;
  if (typeof elaboration === "string" && elaboration.trim()) {
    lines.push({ heading: "Elaborations (from BC curriculum)", items: elaboration.split(" || ").map((item) => item.trim()).filter(Boolean) });
  }
  const guiding = standard.extra.guiding_question;
  if (typeof guiding === "string" && guiding) lines.push({ heading: "Guiding question", items: [guiding] });
  for (const [key, heading] of [
    ["knowledge", "Knowledge"],
    ["understanding", "Understanding"],
    ["skills_procedures", "Skills & procedures"],
  ] as const) {
    const value = standard.extra[key];
    if (typeof value === "string" && value.trim()) {
      lines.push({
        heading,
        items: value.replaceAll(" || ", " | ").split(" | ").map((item) => item.trim()).filter(Boolean),
      });
    }
  }
  const note = standard.extra.note;
  if (
    typeof note === "string" &&
    note.trim() &&
    !note.startsWith("Alberta numbers") &&
    !note.startsWith("List items") &&
    !note.startsWith("Poster prints")
  ) {
    lines.push({ heading: "Note", items: [note] });
  }
  return lines;
}

function processTags(standard: StandardRecord): { code: string; label: string }[] {
  const raw = standard.extra.processes;
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw.split(",").map((part) => part.trim()).filter(Boolean).map((code) => ({
    code,
    label: PROCESS_LEGEND[code] ?? code,
  }));
}

function sequenceView(code: string, grade: number, docKey: string, on: string) {
  if (!hasPublishedSequence(code, grade, on)) return null;
  const catalog = getCatalog();
  const sequence = catalog.sequences.find((item) => item.jurisdiction === code && item.grade === grade && item.docKey === docKey);
  if (!sequence) return null;
  const items = catalog.sequenceItems.filter((item) => item.position > 0);
  const standards = standardsFor(docKey, grade);
  const byId = new Map(standards.map((standard) => [standard.id, standard]));
  const positions = [...new Set(items.map((item) => item.position))].sort((a, b) => a - b);
  const seenSkills = new Set<string>();
  const blocks: SequenceBlock[] = positions.map((position) => {
    const blockItems = items.filter((item) => item.position === position);
    const title = blockItems[0]?.blockTitle ?? "";
    const approxWeeks = blockItems[0]?.approxWeeks ?? null;
    const main: PageItem[] = [];
    const review: PageItem[] = [];
    const comingSoon: PageItem[] = [];
    for (const item of blockItems.filter((entry) => !entry.isSpiral)) {
      const standard = byId.get(item.standardId);
      if (!standard) continue;
      if (!item.skillSlug) {
        comingSoon.push(expectationItem(standard));
        continue;
      }
      const skill = catalog.skills.find((entry) => entry.slug === item.skillSlug);
      if (!skill) continue;
      const rendered = skillItem(skill, standards);
      if (seenSkills.has(skill.slug)) review.push(rendered);
      else {
        seenSkills.add(skill.slug);
        main.push(rendered);
      }
    }
    const keep = blockItems.filter((item) => item.isSpiral);
    const keepPractising: ChipModel[] = [];
    const seenCodes = new Set<string>();
    for (const item of keep) {
      const standard = byId.get(item.standardId);
      if (!standard || seenCodes.has(standard.code)) continue;
      seenCodes.add(standard.code);
      keepPractising.push(chipFor(standard));
    }
    return { position, title, approxWeeks, main, review, comingSoon, keepPractising };
  });
  return {
    label: sequence.label,
    disclaimer:
      "Ontario's curriculum lists expectations by strand and does not set a teaching order. This order is our suggestion, based on how Ontario school boards plan Grade 3: number and operations early, with facts and mental math practised all year. Your teacher's order may differ.",
    blocks,
  };
}

export function staticCurriculumParams(on = todayIso()): { province: string; grade: string }[] {
  return getCatalog()
    .jurisdictions
    .filter((item) => item.publishStatus === "published")
    .flatMap((item) => publishedGrades(item.code, on).map((grade) => ({ province: item.slug, grade: `grade-${grade}` })));
}
