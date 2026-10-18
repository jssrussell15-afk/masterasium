import { StrategyDesk } from "@/components/strategy-desk";
import { loadStrategyLines } from "@/lib/strategy/load";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function StrategyDeskLive({ supabase, childId }: { supabase: SupabaseClient; childId: string }) {
  const lines = await loadStrategyLines(supabase, childId).catch(() => null);
  if (!lines || lines.length === 0) return null;
  return <StrategyDesk lines={lines} />;
}
