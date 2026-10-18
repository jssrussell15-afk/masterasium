import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rls = readFileSync("supabase/migrations/20261018160000_rls_and_rate_limits.sql", "utf8");
const rename = readFileSync("supabase/migrations/20261018153000_rename_skill_state_streak.sql", "utf8");
const billing = readFileSync("supabase/migrations/20261018161000_stripe_and_xai_usage.sql", "utf8");

describe("security migrations", () => {
  it("renames the consecutive-correct column and does not create a streaks table", () => {
    expect(rename).toContain("rename column streak to consecutive_correct");
    expect(rename).not.toContain("create table");
    expect(rls).toContain("There is no streaks table and no content_flags table");
    expect(rls).not.toMatch(/create table[^;]*content_flags/i);
  });

  it("adds policies for the two previously empty RLS tables and locks sign-in at 5", () => {
    expect(rls).toContain("parents read their children's sessions");
    expect(rls).toContain("students read their own sessions");
    expect(rls).toContain("parents read their children's login attempts");
    expect(rls).toContain(">= 5");
    expect(rls).toContain("interval '15 minutes'");
    expect(rls).toContain("revoke all on function public.request_student_token()");
    expect(rls).toContain("revoke all on function public.enforce_two_children()");
    expect(rls).toContain("set search_path = pg_catalog, public");
  });

  it("stores stripe event ids and xai usage without client access", () => {
    expect(billing).toContain("create table if not exists public.stripe_events");
    expect(billing).toContain("create table if not exists public.xai_usage");
    expect(billing).toContain("no client access to stripe events");
    expect(billing).toContain("no client access to xai usage");
  });
});