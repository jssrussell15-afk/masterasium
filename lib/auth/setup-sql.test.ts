import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAME_SIGN_IN_SQL } from "@/lib/auth/name-sign-in-sql";
import { STUDENT_LOGIN_SETUP_SQL } from "@/lib/auth/setup-sql";

describe("student login setup SQL", () => {
  it("matches the migration the parent pastes", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/005_student_login.sql", import.meta.url),
      "utf8",
    );
    expect(STUDENT_LOGIN_SETUP_SQL).toBe(sql);
  });

  it("matches the first-name sign-in statements", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/010_student_name_sign_in.sql", import.meta.url),
      "utf8",
    );
    expect(NAME_SIGN_IN_SQL).toBe(sql);
  });
});
