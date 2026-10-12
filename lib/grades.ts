export const GRADES = [
  { grade: 1, available: true, label: "Grade 1" },
  { grade: 2, available: false, label: "Grade 2" },
  { grade: 3, available: false, label: "Grade 3" },
  { grade: 4, available: false, label: "Grade 4" },
  { grade: 5, available: true, label: "Grade 5" },
  { grade: 6, available: false, label: "Grade 6" },
  { grade: 7, available: false, label: "Grade 7" },
  { grade: 8, available: false, label: "Grade 8" },
] as const;

export type SupportedGrade = 1 | 5;

export function isSupportedGrade(value: number): value is SupportedGrade {
  return value === 1 || value === 5;
}
