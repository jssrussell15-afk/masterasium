/** Grades 1–3 use the short desk. Grade 4 and up use the full breakdown. There is no parent switch. */
export function isSimpleDesk(grade: number): boolean {
  return grade <= 3;
}
