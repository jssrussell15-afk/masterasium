"use server";

import { friendlyDbError } from "@/lib/db-error";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import { IMAGE_CONSENT_VERSION } from "@/lib/create/types";

export async function saveCreateSettings(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { ok: false, error: friendlyDbError(profileError) };
  const childId = String(formData.get("childId") ?? "");
  const enabled = formData.get("enabled") === "1";
  const writeOwn = formData.get("writeOwn") === "1";
  const dailyLimit = Number(formData.get("dailyLimit") ?? 1);
  const { error } = await supabase.rpc("set_create_settings", {
    p_child_id: childId,
    p_enabled: enabled,
    p_write_own: writeOwn,
    p_daily_limit: dailyLimit,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };
  return { ok: true };
}

export async function saveCreateConsent(childId: string, grant: boolean): Promise<{
  ok: boolean;
  at?: string | null;
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { ok: false, error: friendlyDbError(profileError) };
  const { error } = await supabase.rpc("set_create_image_consent", {
    p_child_id: childId,
    p_version: IMAGE_CONSENT_VERSION,
    p_grant: grant,
  });
  if (error) return { ok: false, error: friendlyDbError(error) };
  return { ok: true, at: grant ? new Date().toISOString() : null };
}
