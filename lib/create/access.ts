import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CREATE_FLAGS, type CreateFlags } from "@/lib/create/types";
import { toSessionRow, type SessionMeta } from "@/lib/create/session-meta";

function limitOf(value: unknown): number {
  if (value === 2 || value === 3) return value;
  return 1;
}

export function flagsFromRow(row: Record<string, unknown> | null): CreateFlags {
  if (!row) return { ...DEFAULT_CREATE_FLAGS };
  return {
    enabled: row.create_enabled === true,
    writeOwn: row.create_write_own === true,
    dailyLimit: limitOf(row.create_daily_limit),
    consentAt: typeof row.create_image_consent_at === "string" ? row.create_image_consent_at : null,
    consentVersion:
      typeof row.create_image_consent_version === "string" ? row.create_image_consent_version : null,
    projectsToday: 0,
  };
}

export async function loadCreateFlags(
  supabase: SupabaseClient,
  childId: string,
): Promise<CreateFlags> {
  const { data, error } = await supabase
    .from("children")
    .select(
      "create_enabled, create_write_own, create_daily_limit, create_image_consent_at, create_image_consent_version",
    )
    .eq("id", childId)
    .maybeSingle();
  if (error || !data) return { ...DEFAULT_CREATE_FLAGS };
  return flagsFromRow(data as Record<string, unknown>);
}

export async function loadCreateSessions(
  supabase: SupabaseClient,
  childId: string,
): Promise<{ rows: SessionMeta[]; unavailable: boolean }> {
  const { data, error } = await supabase
    .from("create_sessions")
    .select(
      "child_id, project_type, started_at, finished_at, steps_completed, keep_count, retry_count, fix_count, mismatch_flags, reflection_taps, used_write_my_own",
    )
    .eq("child_id", childId)
    .order("started_at", { ascending: true });
  if (error) return { rows: [], unavailable: true };
  const rows: SessionMeta[] = [];
  for (const item of data ?? []) {
    const row = toSessionRow(item);
    if (row) rows.push(row);
  }
  return { rows, unavailable: false };
}
