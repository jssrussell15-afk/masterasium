import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, requireSupabaseEnv } from "@/lib/supabase/env";

/** Anon client that sends the practice token. RLS reads it as x-student-token. */
export function createStudentClient(token: string): SupabaseClient {
  const { url, key } = requireSupabaseEnv();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-student-token": token },
    },
  });
}

/**
 * Child id for a live student token.
 * Missing, expired, and failed checks all return null so callers fail closed.
 */
export async function currentStudentId(token: string): Promise<string | null> {
  const trimmed = token.trim();
  if (!trimmed || !isSupabaseConfigured()) return null;
  try {
    const { data, error } = await createStudentClient(trimmed).rpc("current_student_id");
    if (error || typeof data !== "string" || !data) return null;
    return data;
  } catch {
    return null;
  }
}
