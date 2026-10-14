import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GRADE_PROGRESS_SETUP_SQL } from "@/lib/practice/grade-setup-sql";

describe("grade progress setup SQL", () => {
  it("matches the migration the parent pastes", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/006_grade_progress.sql", import.meta.url),
      "utf8",
    );
    expect(GRADE_PROGRESS_SETUP_SQL).toBe(sql);
  });
});
