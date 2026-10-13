import type { SupportedGrade } from "@/lib/grades";
import { CATALOG } from "@/lib/practice/bank";

/**
 * One skill per catalog entry. `order` is the path through a grade.
 * `prerequisites` chains each skill to the one before it, so the scheduler
 * can unlock the next skill without a separate graph.
 */
export type Skill = {
  id: string;
  grade: SupportedGrade;
  title: string;
  summary: string;
  order: number;
  prerequisites: string[];
  responseHint: string | null;
  examplePrompt: string;
  exampleSteps: string[];
  exampleAnswer: string;
};

const orderInGrade = new Map<SupportedGrade, number>();
const previousInGrade = new Map<SupportedGrade, string>();

export const SKILLS: Skill[] = CATALOG.map((blueprint) => {
  const order = (orderInGrade.get(blueprint.grade) ?? 0) + 1;
  orderInGrade.set(blueprint.grade, order);
  const previousId = previousInGrade.get(blueprint.grade);
  previousInGrade.set(blueprint.grade, blueprint.id);
  return {
    id: blueprint.id,
    grade: blueprint.grade,
    title: blueprint.title,
    summary: blueprint.summary,
    order,
    prerequisites: previousId ? [previousId] : [],
    responseHint: blueprint.responseHint,
    examplePrompt: blueprint.example.prompt,
    exampleSteps: blueprint.example.steps,
    exampleAnswer: blueprint.example.answer,
  };
});

export function skillsForGrade(grade: SupportedGrade): Skill[] {
  return SKILLS.filter((skill) => skill.grade === grade).sort((a, b) => a.order - b.order);
}

export function skillById(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id);
}
