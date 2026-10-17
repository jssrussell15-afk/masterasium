/**
 * Grades 1–3 write on paper. From grade 4, notes can sit beside the question.
 * The pad is never the answer, and there is no drawing canvas.
 */
export function allowsScratchpad(grade: number): boolean {
  return grade >= 4;
}
