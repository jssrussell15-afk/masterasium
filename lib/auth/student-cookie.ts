export const STUDENT_COOKIE = "masterasium_student";

const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

export function studentCookieOptions(maxAge = FOURTEEN_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}
