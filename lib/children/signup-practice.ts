const CHILD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[0-9a-f]{64}$/;

/** Child id and practice token returned by create_signup_child. */
export function readSignupPractice(data: unknown): { childId: string; token: string } | null {
  let value = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return null;
    }
  }
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const childId = typeof record.child_id === "string" ? record.child_id : "";
  const token = typeof record.token === "string" ? record.token : "";
  if (!CHILD_ID.test(childId) || !TOKEN.test(token)) return null;
  return { childId, token };
}

export function signupPracticePath(childId: string): string {
  return `/practice/${childId}`;
}

/** Practice question route for a real child id. Null when the id is not a child id. */
export function practicePathForChild(childId: string): string | null {
  if (!CHILD_ID.test(childId)) return null;
  return signupPracticePath(childId);
}

export function signupReadyPath(childId: string): string {
  return `/signup/child/ready/${childId}`;
}

/** HttpOnly cookie value. The token stays off the confirmation page. */
export function signupHandoffCookie(practice: { childId: string; token: string }): string {
  return `${practice.childId}.${practice.token}`;
}

export function readSignupHandoff(value: string | undefined | null): { childId: string; token: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 0) return null;
  return readSignupPractice({
    child_id: value.slice(0, dot),
    token: value.slice(dot + 1),
  });
}
