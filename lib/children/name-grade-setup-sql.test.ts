import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHILD_NAME_GRADE_SETUP_SQL } from "@/lib/children/name-grade-setup-sql";

describe("child name and grade setup SQL", () => {
  it("matches the migration the parent pastes", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/009_child_name_grade.sql", import.meta.url),
      "utf8",
    );
    expect(CHILD_NAME_GRADE_SETUP_SQL).toBe(sql);
    expect(sql).toContain("working_grade");
    expect(sql).toContain("create_signup_child");
    expect(sql).toContain("student_sessions");
  });
});
