import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readWorkerEnv } from "@/lib/server/env";

/** Service-role client for webhook idempotency and spend rows. Never import from client code. */
export function createServiceClient(): SupabaseClient | null {
  const url = readWorkerEnv("NEXT_PUBLIC_SUPABASE_URL") ?? readWorkerEnv("SUPABASE_URL");
  const key = readWorkerEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
