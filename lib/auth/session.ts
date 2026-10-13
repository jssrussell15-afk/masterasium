import "server-only";

import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function requireUser(): Promise<{ supabase: SupabaseClient; user: User }> {
  if (!isSupabaseConfigured()) redirect("/setup");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
}

// The signup trigger inserts this row. A plain insert avoids the upsert path,
// which Postgres treats as an update and rejects when no update policy exists.
export async function ensureProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ message: string; code?: string } | null> {
  const { error } = await supabase.from("profiles").insert({ id: userId });
  if (!error || error.code === "23505") return null;
  return error;
}
