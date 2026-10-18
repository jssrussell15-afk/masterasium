import { SIGNUP_PRACTICE_COOKIE, STUDENT_COOKIE } from "@/lib/auth/student-cookie";

/** Cookies the browser script can expire. Student cookies are httpOnly, so the server clears those. */
export function isBrowserAuthCookie(name: string): boolean {
  return name.startsWith("sb-") || name === STUDENT_COOKIE || name === SIGNUP_PRACTICE_COOKIE;
}

const EXPIRED = "Max-Age=0; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

/** Assignments that drop auth cookies visible to document.cookie, with and without Secure. */
export function clearBrowserAuthCookieAssignments(cookieHeader: string): string[] {
  const names = cookieHeader
    .split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => name.length > 0 && isBrowserAuthCookie(name));
  return [...new Set(names)].flatMap((name) => [
    `${name}=; ${EXPIRED}`,
    `${name}=; ${EXPIRED}; Secure`,
  ]);
}

export function clearBrowserAuthCookies(): void {
  if (typeof document === "undefined") return;
  for (const assignment of clearBrowserAuthCookieAssignments(document.cookie)) {
    document.cookie = assignment;
  }
}
