import type { SupabaseClient } from "@supabase/supabase-js";
import { friendlyDbError, isPlacementMissing } from "@/lib/db-error";
import { parsePlacement, type PlacementResult } from "@/lib/practice/placement";

export type PlacementLoad = {
  available: boolean;
  placement: PlacementResult | null;
  error: string | null;
};

export async function loadPlacement(supabase: SupabaseClient, childId: string): Promise<PlacementLoad> {
  const { data, error } = await supabase
    .from("children")
    .select("placement")
    .eq("id", childId)
    .maybeSingle();

  if (error) {
    if (isPlacementMissing(error)) return { available: false, placement: null, error: null };
    return { available: false, placement: null, error: friendlyDbError(error) };
  }

  return { available: true, placement: parsePlacement(data?.placement), error: null };
}
