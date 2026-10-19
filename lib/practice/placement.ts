import type { SupportedGrade } from "@/lib/grades";
import { STRANDS, ontarioLine, type StrandId } from "@/lib/curriculum/ontario";
import { answersMatch } from "@/lib/practice/answers";
import { skillById, skillsForGrade, warmUpSkill, type Skill } from "@/lib/practice/skills";

/**
 * Grades 7 and 8 use the same five-question check as Grades 3–6.
 * Prior-grade items and one-strand-each items both exist in the catalog,
 * so the rule does not need a separate path.
 */
export const PLACEMENT_CHECK_GRADES: SupportedGrade[] = [3, 4, 5, 6, 7, 8];

export const PLACEMENT_INTRO_TITLE = "Let's do a quick check so we know where to start.";
export const PLACEMENT_INTRO_HELP = "Just a few questions. Take your time.";
export const PLACEMENT_READY = "I'm ready";
export const PLACEMENT_GOT_IT = "Got it.";
export const PLACEMENT_UNSURE_LABEL = "I'm not sure yet";
export const PLACEMENT_RESULT = "Nice work. Here's where we'll start.";
export const PLACEMENT_BEGIN = "Let's begin.";
export const GRADE_PROMPT_HELP = "This tells us where the quick check begins.";
export const UNSURE = "unsure";

export type CheckMark = "clear" | "miss";

export type PlacementChoice = {
  id: string;
  label: string;
  parts: number;
  shaded: number;
};

export type PlacementItem = {
  skillId: string;
  strand: StrandId;
  grade: SupportedGrade;
  role: "prior" | "stated";
  prompt: string;
  answer: string;
  responseHint: string | null;
  choices: PlacementChoice[] | null;
};

export type PlacementResult = {
  status: "skipped" | "placed";
  statedGrade: SupportedGrade;
  placedGrade: SupportedGrade;
  startSkillId: string;
  topic: string;
  readyStrand: StrandId | null;
  readyStrandLabel: string | null;
  earlyStop: boolean;
  clearedAll: boolean;
};

export type PlacementBegin =
  | { kind: "skip"; line: string; result: PlacementResult }
  | { kind: "check"; items: PlacementItem[] };

type Grade3Spec = {
  skillId: string;
  prompt: string;
  answer: string;
  choices?: PlacementChoice[];
};

/** Verbatim Grade 3 stems. Other grades use the same shape from the skill examples. */
const GRADE_3: Grade3Spec[] = [
  { skillId: "g2-add-sub", prompt: "What is 47 + 25?", answer: "72" },
  { skillId: "g2-place", prompt: "How many tens are in 63?", answer: "6" },
  {
    skillId: "g3-mult",
    prompt: "There are 4 bags with 6 apples in each. How many apples?",
    answer: "24",
  },
  {
    skillId: "g3-fractions",
    prompt: "Tap the picture that shows one third shaded.",
    answer: "third",
    choices: [
      { id: "half", label: "One half shaded", parts: 2, shaded: 1 },
      { id: "third", label: "One third shaded", parts: 3, shaded: 1 },
      { id: "fourth", label: "One fourth shaded", parts: 4, shaded: 1 },
    ],
  },
  {
    skillId: "g3-perimeter",
    prompt: "This rectangle is 3 squares wide and 5 long. How many squares?",
    answer: "15",
  },
];

const STATED_STRANDS: StrandId[] = ["operations", "number", "measurement", "geometry", "data"];

export function gradePromptTitle(name: string): string {
  return `What grade is ${name} in?`;
}

export function gradeSkipLine(grade: SupportedGrade): string {
  return `Grade ${grade}. We'll start with the basics and adjust as we go.`;
}

export function parentStartLine(name: string, topic: string, grade: number): string {
  return `We started ${name} on ${topic} at grade ${grade}, the strongest place to build from.`;
}

export function parentReadyLine(name: string, strand: string): string {
  return `${name} looks ready for more in ${strand}, so we'll mix some in.`;
}

export function parentAdjustLine(name: string): string {
  return `We'll still adjust as ${name} practises.`;
}

export const PLACEMENT_FAQ = [
  {
    question: "Why do we do a quick check?",
    answer:
      "It shows us a strong place to begin. Grades 3 and up answer a few questions. Grades 1 and 2 start with the basics and we adjust as we go. There is no score.",
  },
  {
    question: "Why might my child start below their grade?",
    answer:
      "If the first two questions are still tricky, we start at the grade just before. That is the strongest place to build from. We'll still adjust as they practise.",
  },
  {
    question: "How do I change the starting point?",
    answer:
      "Open the parent desk and choose Change starting point. You can start at your child's grade, or pick a topic to start with. We'll still adjust as they practise.",
  },
] as const;

export function parentPlacementCopy(
  name: string,
  placement: PlacementResult,
): { start: string; ready: string | null } {
  return {
    start: parentStartLine(name, placement.topic, placement.placedGrade),
    ready:
      placement.clearedAll && placement.readyStrandLabel
        ? parentReadyLine(name, placement.readyStrandLabel)
        : null,
  };
}

function strandOf(skillId: string): StrandId {
  const strand = ontarioLine(skillId)?.strand;
  if (!strand) throw new Error(`Skill ${skillId} has no strand.`);
  return strand;
}

function priorCore(prior: SupportedGrade): [string, string] {
  const skills = skillsForGrade(prior);
  const operations = skills.filter((skill) => strandOf(skill.id) === "operations");
  const place = skills.find((skill) => skill.id.includes("place"));
  const number = skills.find((skill) => strandOf(skill.id) === "number");
  const first = operations[0] ?? skills[0];
  const second =
    place ?? number ?? operations[1] ?? skills.find((skill) => skill.id !== first?.id);
  if (!first || !second || first.id === second.id) {
    throw new Error(`Grade ${prior} is missing two core skills.`);
  }
  return [first.id, second.id];
}

function signature(skills: Skill[], strand: StrandId): Skill | undefined {
  const inStrand = skills.filter((skill) => strandOf(skill.id) === strand);
  if (inStrand.length === 0) return undefined;
  if (strand === "operations") {
    return inStrand.find((skill) => /mult|group/.test(skill.id)) ?? inStrand[0];
  }
  if (strand === "number") {
    return (
      inStrand.find((skill) => /frac/.test(skill.id)) ??
      inStrand.find((skill) => /place/.test(skill.id)) ??
      inStrand[0]
    );
  }
  if (strand === "measurement") {
    return inStrand.find((skill) => /area|perimeter|measure|volume|surface/.test(skill.id)) ?? inStrand[0];
  }
  return inStrand[0];
}

function statedSkills(grade: SupportedGrade): [string, string, string] {
  const skills = skillsForGrade(grade);
  const picked: string[] = [];
  for (const strand of STATED_STRANDS) {
    if (picked.length === 3) break;
    const skill = signature(skills, strand);
    if (skill) picked.push(skill.id);
  }
  if (picked.length < 3) throw new Error(`Grade ${grade} needs three strands for the quick check.`);
  return [picked[0], picked[1], picked[2]];
}

function itemFrom(
  skillId: string,
  grade: SupportedGrade,
  role: "prior" | "stated",
  custom?: Grade3Spec,
): PlacementItem {
  const skill = skillById(skillId);
  if (!skill) throw new Error(`Missing placement skill ${skillId}.`);
  return {
    skillId,
    strand: strandOf(skillId),
    grade,
    role,
    prompt: custom?.prompt ?? skill.examplePrompt,
    answer: custom?.answer ?? skill.exampleAnswer,
    responseHint: custom ? null : skill.responseHint,
    choices: custom?.choices ?? null,
  };
}

export function placementItems(statedGrade: SupportedGrade): PlacementItem[] {
  const prior = (statedGrade - 1) as SupportedGrade;
  const [first, second] = priorCore(prior);
  const [third, fourth, fifth] = statedSkills(statedGrade);
  const specs = [
    { skillId: first, grade: prior, role: "prior" as const },
    { skillId: second, grade: prior, role: "prior" as const },
    { skillId: third, grade: statedGrade, role: "stated" as const },
    { skillId: fourth, grade: statedGrade, role: "stated" as const },
    { skillId: fifth, grade: statedGrade, role: "stated" as const },
  ];
  if (statedGrade === 3) {
    specs.forEach((spec, index) => {
      if (spec.skillId !== GRADE_3[index]?.skillId) {
        throw new Error(`Grade 3 quick check drifted at ${spec.skillId}.`);
      }
    });
  }
  return specs.map((spec, index) =>
    itemFrom(spec.skillId, spec.grade, spec.role, statedGrade === 3 ? GRADE_3[index] : undefined),
  );
}

function anchored(grade: SupportedGrade, skill: Skill, status: PlacementResult["status"]): PlacementResult {
  return {
    status,
    statedGrade: grade,
    placedGrade: grade,
    startSkillId: skill.id,
    topic: skill.title,
    readyStrand: null,
    readyStrandLabel: null,
    earlyStop: false,
    clearedAll: false,
  };
}

export function beginPlacement(grade: SupportedGrade): PlacementBegin {
  if (!PLACEMENT_CHECK_GRADES.includes(grade)) {
    return { kind: "skip", line: gradeSkipLine(grade), result: anchored(grade, warmUpSkill(grade), "skipped") };
  }
  return { kind: "check", items: placementItems(grade) };
}

export function markPlacementAnswer(item: PlacementItem, given: string): CheckMark {
  const value = given.trim();
  if (!value || value.toLowerCase() === UNSURE) return "miss";
  if (item.choices) return value === item.answer ? "clear" : "miss";
  return answersMatch(item.answer, given) ? "clear" : "miss";
}

function resultFor(
  stated: SupportedGrade,
  marks: CheckMark[],
  items: PlacementItem[],
  early: boolean,
): PlacementResult {
  const clearedAll = !early && marks.length === items.length && marks.every((mark) => mark === "clear");
  const placedGrade = (early ? stated - 1 : stated) as SupportedGrade;
  const start = warmUpSkill(placedGrade);
  const readyId = clearedAll ? items[items.length - 1]?.strand ?? null : null;
  const ready = readyId ? STRANDS.find((strand) => strand.id === readyId) : undefined;
  return {
    status: "placed",
    statedGrade: stated,
    placedGrade,
    startSkillId: start.id,
    topic: start.title,
    readyStrand: ready?.id ?? null,
    readyStrandLabel: ready?.label ?? null,
    earlyStop: early,
    clearedAll,
  };
}

export function outcomeFromMarks(grade: SupportedGrade, marks: CheckMark[]): PlacementResult | null {
  const began = beginPlacement(grade);
  if (began.kind === "skip") return marks.length === 0 ? began.result : null;
  const early = marks.length >= 2 && marks[0] === "miss" && marks[1] === "miss";
  if (early) return resultFor(grade, marks.slice(0, 2), began.items, true);
  if (marks.length !== began.items.length) return null;
  return resultFor(grade, marks, began.items, false);
}

export function stepPlacement(
  grade: SupportedGrade,
  marks: CheckMark[],
): { done: false; item: PlacementItem } | { done: true; result: PlacementResult } {
  const began = beginPlacement(grade);
  if (began.kind === "skip") return { done: true, result: began.result };
  const early = marks.length >= 2 && marks[0] === "miss" && marks[1] === "miss";
  if (early || marks.length >= began.items.length) {
    const result = outcomeFromMarks(grade, early ? marks.slice(0, 2) : marks);
    if (!result) return { done: false, item: began.items[0] };
    return { done: true, result };
  }
  return { done: false, item: began.items[marks.length] };
}

export function parseMarks(value: string): CheckMark[] | null {
  const trimmed = value.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(",");
  if (!parts.every((part) => part === "clear" || part === "miss")) return null;
  return parts;
}

export function startingPointAtGrade(grade: SupportedGrade): PlacementResult {
  return anchored(grade, warmUpSkill(grade), "placed");
}

export function firstSkillInStrand(grade: SupportedGrade, strand: StrandId): Skill | null {
  return skillsForGrade(grade).find((skill) => strandOf(skill.id) === strand) ?? null;
}

export function startingPointAtStrand(grade: SupportedGrade, strand: StrandId): PlacementResult | null {
  const skill = firstSkillInStrand(grade, strand);
  if (!skill) return null;
  return anchored(grade, skill, "placed");
}

export type StrandChoice = {
  id: StrandId;
  label: string;
  skillId: string;
  topic: string;
};

export function strandChoices(grade: SupportedGrade): StrandChoice[] {
  return STRANDS.flatMap((strand) => {
    const skill = firstSkillInStrand(grade, strand.id);
    return skill ? [{ id: strand.id, label: strand.label, skillId: skill.id, topic: skill.title }] : [];
  });
}

/** Skill mixed into later practice when the check was completely clear. */
export function mixSkillId(placement: PlacementResult): string | null {
  if (!placement.clearedAll || !placement.readyStrand) return null;
  const skill = firstSkillInStrand(placement.placedGrade, placement.readyStrand);
  if (!skill || skill.id === placement.startSkillId) return null;
  return skill.id;
}

export function parsePlacement(value: unknown): PlacementResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const status = row.status === "skipped" || row.status === "placed" ? row.status : null;
  const statedGrade = Number(row.statedGrade);
  const placedGrade = Number(row.placedGrade);
  const startSkillId = typeof row.startSkillId === "string" ? row.startSkillId : "";
  const topic = typeof row.topic === "string" ? row.topic : "";
  const skill = skillById(startSkillId);
  if (!status || !skill || !topic) return null;
  if (statedGrade < 1 || statedGrade > 8 || placedGrade < 1 || placedGrade > 8) return null;
  const ready = typeof row.readyStrand === "string" ? STRANDS.find((strand) => strand.id === row.readyStrand) : undefined;
  return {
    status,
    statedGrade: statedGrade as SupportedGrade,
    placedGrade: placedGrade as SupportedGrade,
    startSkillId,
    topic,
    readyStrand: ready?.id ?? null,
    readyStrandLabel: ready?.label ?? null,
    earlyStop: row.earlyStop === true,
    clearedAll: row.clearedAll === true,
  };
}

export function practiceAnchor(placement: PlacementResult | null, workingGrade: SupportedGrade): {
  startSkillId?: string;
  mixSkillId?: string;
} {
  if (!placement || placement.placedGrade !== workingGrade) return {};
  const skill = skillById(placement.startSkillId);
  if (!skill || skill.grade !== workingGrade) return {};
  const mix = mixSkillId(placement);
  return {
    startSkillId: skill.id,
    ...(mix ? { mixSkillId: mix } : {}),
  };
}
