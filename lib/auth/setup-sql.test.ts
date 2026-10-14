import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { STUDENT_LOGIN_SETUP_SQL } from "@/lib/auth/setup-sql";

describe("student login setup SQL", () => {
  it("matches the migration the parent pastes", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/005_student_login.sql", import.meta.url),
      "utf8",
    );
    expect(STUDENT_LOGIN_SETUP_SQL).toBe(sql);
  });
});
