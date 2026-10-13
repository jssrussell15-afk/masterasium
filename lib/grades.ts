export const GRADES = [
  { grade: 1, available: true, label: "Grade 1" },
  { grade: 2, available: true, label: "Grade 2" },
  { grade: 3, available: true, label: "Grade 3" },
  { grade: 4, available: true, label: "Grade 4" },
  { grade: 5, available: true, label: "Grade 5" },
  { grade: 6, available: true, label: "Grade 6" },
  { grade: 7, available: true, label: "Grade 7" },
  { grade: 8, available: true, label: "Grade 8" },
] as const;

export type SupportedGrade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export function isSupportedGrade(value: number): value is SupportedGrade {
  return Number.isInteger(value) && value >= 1 && value <= 8;
}
