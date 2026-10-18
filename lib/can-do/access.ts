/** The student page reads only the signed-in student. A different id is refused. */
export function studentCanDoChildId(sessionChildId: string, requestedChildId?: string | null): string | null {
  const sessionId = sessionChildId.trim();
  if (!sessionId) return null;
  if (requestedChildId && requestedChildId !== sessionId) return null;
  return sessionId;
}

/** A parent desk opens only a child already on that parent's roster. */
export function parentCanDoChildId(rosterChildIds: readonly string[], childId: string): string | null {
  return rosterChildIds.includes(childId) ? childId : null;
}
