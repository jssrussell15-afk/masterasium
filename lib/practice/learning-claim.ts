import type { SupabaseClient } from "@supabase/supabase-js";

export type ClaimedAttempt = {
  skill_id: string;
  correct: boolean;
};

export type LearningClaimResult = {
  error: string | null;
  /** False when the flag write failed. The answer save is not failed for the child. */
  counted: boolean;
};

/**
 * Flips learning_applied from false to true and returns the row only for the writer that won.
 * A retry that loses the flip must not apply mastery again.
 */
export async function claimLearningFlag(
  supabase: SupabaseClient,
  childId: string,
  attemptId: string,
): Promise<{ row: ClaimedAttempt | null; errorMessage: string | null }> {
  const { data, error } = await supabase
    .from("attempts")
    .update({ learning_applied: true })
    .eq("child_id", childId)
    .eq("client_attempt_id", attemptId)
    .eq("learning_applied", false)
    .select("skill_id, correct")
    .maybeSingle();
  if (error) return { row: null, errorMessage: error.message };
  return { row: (data as ClaimedAttempt | null) ?? null, errorMessage: null };
}

async function releaseLearningFlag(
  supabase: SupabaseClient,
  childId: string,
  attemptId: string,
): Promise<void> {
  const { error } = await supabase
    .from("attempts")
    .update({ learning_applied: false })
    .eq("child_id", childId)
    .eq("client_attempt_id", attemptId)
    .eq("learning_applied", true);
  if (error) console.error("Could not release learning_applied.", error.message);
}

/**
 * Applies mastery only after this call wins the flag. A failed flag write is logged and
 * is not returned as a child-facing error. A failed mastery save puts the flag back.
 */
export async function runClaimedLearning(input: {
  supabase: SupabaseClient;
  childId: string;
  attemptId: string;
  apply: (row: ClaimedAttempt) => Promise<string | null>;
}): Promise<LearningClaimResult> {
  const claim = await claimLearningFlag(input.supabase, input.childId, input.attemptId);
  if (claim.errorMessage) {
    console.error("Could not mark learning_applied.", claim.errorMessage);
    return { error: null, counted: false };
  }
  if (!claim.row) return { error: null, counted: true };
  const applyError = await input.apply(claim.row);
  if (applyError) {
    await releaseLearningFlag(input.supabase, input.childId, input.attemptId);
    return { error: applyError, counted: false };
  }
  return { error: null, counted: true };
}
