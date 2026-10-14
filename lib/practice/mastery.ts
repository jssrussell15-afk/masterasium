import type { SkillStatus } from "@/lib/practice/types";

export type MasteryMark = "mastered" | "in-progress" | "not-started";

export function masteryMark(status: SkillStatus): MasteryMark {
  if (status === "mastered") return "mastered";
  if (status === "not-started") return "not-started";
  return "in-progress";
}

export function masteryLabel(mark: MasteryMark): string {
  if (mark === "mastered") return "Mastered";
  if (mark === "in-progress") return "In progress";
  return "Not started";
}
