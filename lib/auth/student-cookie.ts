export const STUDENT_COOKIE = "masterasium_student";

/** Holds the practice token until the parent picks a button on the confirmation card. */
export const SIGNUP_PRACTICE_COOKIE = "masterasium_signup_practice";

const FOURTEEN_DAYS = 60 * 60 * 24 * 14;

export function studentCookieOptions(maxAge = FOURTEEN_DAYS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge,
    // maxAge 0 is ignored by some cookie serializers when computing Expires.
    ...(maxAge === 0 ? { expires: new Date(0) } : {}),
  };
}
