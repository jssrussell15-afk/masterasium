/** Null means "use the grade default": on for Grades 1–2, off otherwise. */
export function readsAloudAutomatically(grade: number, stored: boolean | null | undefined): boolean {
  if (stored === true || stored === false) return stored;
  return grade <= 2;
}

export const READ_ALOUD_LABEL = "Read questions aloud automatically";
export const READ_ALOUD_HELP = "On by default for Grades 1–2. Kids can always tap Listen.";

export function isReadAloudMissing(error: { message: string }): boolean {
  return error.message.toLowerCase().includes("read_questions_aloud");
}
