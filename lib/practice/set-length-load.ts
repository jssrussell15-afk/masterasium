import type { SupabaseClient } from "@supabase/supabase-js";
import { setLengthMinutes } from "@/lib/practice/set-length";

export async function readSetLength(supabase: SupabaseClient, childId?: string): Promise<number> {
  let query = supabase.from("children").select("set_length_minutes");
  if (childId) query = query.eq("id", childId);
  const { data, error } = await query.maybeSingle();
  if (error || !data) return 15;
  return setLengthMinutes((data as { set_length_minutes?: number | null }).set_length_minutes);
}
