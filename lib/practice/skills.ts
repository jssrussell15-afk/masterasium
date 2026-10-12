import type { SupportedGrade } from "@/lib/grades";

/**
 * Starter skills for the Ontario elementary math curriculum (2020), Number strand.
 * `order` is the starter path. `prerequisites` is a list of skill ids so a later
 * skill graph can branch without changing the scheduler.
 */
export type Skill = {
  id: string;
  grade: SupportedGrade;
  title: string;
  summary: string;
  order: number;
  prerequisites: string[];
  responseHint: string | null;
};

export const SKILLS: Skill[] = [
  {
    id: "g1-count-on",
    grade: 1,
    title: "Count on to 50",
    summary: "Name the number that comes next, up to 50.",
    order: 1,
    prerequisites: [],
    responseHint: null,
  },
  {
    id: "g1-compare",
    grade: 1,
    title: "Compare numbers to 50",
    summary: "Choose the greater of two numbers up to 50.",
    order: 2,
    prerequisites: ["g1-count-on"],
    responseHint: null,
  },
  {
    id: "g1-make-ten",
    grade: 1,
    title: "Make 10",
    summary: "Find the missing part of a pair that adds to 10.",
    order: 3,
    prerequisites: ["g1-compare"],
    responseHint: null,
  },
  {
    id: "g1-add-within-10",
    grade: 1,
    title: "Add within 10",
    summary: "Add two numbers whose sum is 10 or less.",
    order: 4,
    prerequisites: ["g1-make-ten"],
    responseHint: null,
  },
  {
    id: "g1-sub-within-10",
    grade: 1,
    title: "Subtract within 10",
    summary: "Subtract from a number up to 10.",
    order: 5,
    prerequisites: ["g1-add-within-10"],
    responseHint: null,
  },
  {
    id: "g1-add-within-20",
    grade: 1,
    title: "Add within 20",
    summary: "Add two numbers whose sum is 20 or less.",
    order: 6,
    prerequisites: ["g1-sub-within-10"],
    responseHint: null,
  },
  {
    id: "g5-place-value",
    grade: 5,
    title: "Place value to 100 000",
    summary: "Give the value of a digit in a number up to 100 000.",
    order: 1,
    prerequisites: [],
    responseHint: "Write the value of the digit, such as 4000, not the digit by itself.",
  },
  {
    id: "g5-mult-facts",
    grade: 5,
    title: "Multiplication facts",
    summary: "Multiply two numbers from 2 to 12.",
    order: 2,
    prerequisites: ["g5-place-value"],
    responseHint: null,
  },
  {
    id: "g5-div-facts",
    grade: 5,
    title: "Division facts",
    summary: "Divide using the related multiplication facts.",
    order: 3,
    prerequisites: ["g5-mult-facts"],
    responseHint: null,
  },
  {
    id: "g5-mult-2-by-1",
    grade: 5,
    title: "Multiply by a one-digit number",
    summary: "Multiply a two-digit number by a one-digit number.",
    order: 4,
    prerequisites: ["g5-div-facts"],
    responseHint: null,
  },
  {
    id: "g5-compare-fractions",
    grade: 5,
    title: "Compare fractions",
    summary: "Compare two fractions with the same denominator.",
    order: 5,
    prerequisites: ["g5-mult-2-by-1"],
    responseHint: "Type the greater fraction, such as 3/8.",
  },
  {
    id: "g5-decimals",
    grade: 5,
    title: "Decimals to hundredths",
    summary: "Add or subtract decimal numbers to hundredths.",
    order: 6,
    prerequisites: ["g5-compare-fractions"],
    responseHint: null,
  },
];

export function skillsForGrade(grade: SupportedGrade): Skill[] {
  return SKILLS.filter((skill) => skill.grade === grade).sort((a, b) => a.order - b.order);
}

export function skillById(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id);
}
