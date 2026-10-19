const ATTEMPT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAttemptId(value: string): boolean {
  return ATTEMPT_ID.test(value);
}

export type StoredAttempt = { learning_applied: boolean } | null;

/** insert: first arrival. apply: the row exists but mastery was not finished. skip: already counted. */
export function attemptWritePlan(existing: StoredAttempt): "insert" | "apply" | "skip" {
  if (!existing) return "insert";
  if (!existing.learning_applied) return "apply";
  return "skip";
}
