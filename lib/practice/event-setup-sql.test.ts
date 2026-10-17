import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRACTICE_EVENTS_SETUP_SQL } from "@/lib/practice/event-setup-sql";

describe("practice events setup SQL", () => {
  it("matches the migration the parent pastes", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/008_practice_events.sql", import.meta.url),
      "utf8",
    );
    expect(PRACTICE_EVENTS_SETUP_SQL).toBe(sql);
  });
});
