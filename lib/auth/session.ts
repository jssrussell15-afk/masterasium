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
