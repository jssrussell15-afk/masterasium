import type { SkillStatus } from "@/lib/practice/types";

export function formatAccuracy(attempted: number, correct: number): string {
  if (attempted === 0) return "—";
  return `${Math.round((correct / attempted) * 100)}%`;
}

export function skillStatusLabel(status: SkillStatus): string {
  if (status === "mastered") return "Mastered";
  if (status === "check") return "Show what you know";
  if (status === "practicing") return "Practicing";
  return "Not started";
}
