"use server";

import { requireStudent } from "@/lib/auth/student";
import { friendlyDbError } from "@/lib/db-error";
import {
  GO_FURTHER_SIZE,
  goFurtherTableMissing,
  isGoFurtherSkill,
} from "@/lib/practice/go-further";
import { isMastered } from "@/lib/practice/scheduler";
import { loadCards } from "@/lib/practice/session";

export async function saveGoFurtherSet(input: {
  childId: string;
  skillId: string;
  asked: number;
  correct: number;
}): Promise<{ error?: string }> {
  if (!isGoFurtherSkill(input.skillId)) return { error: "That set is not available." };
  if (input.asked !== GO_FURTHER_SIZE || input.correct < 0 || input.correct > input.asked) {
    return { error: "That set could not be saved." };
  }

  const session = await requireStudent();
  if ("error" in session) return { error: session.error };
  if (session.child.id !== input.childId) return { error: "That practice session is not available." };

  const loaded = await loadCards(session.supabase, input.childId);
  if (loaded.error) return { error: loaded.error };
  const card = loaded.cards.find((item) => item.skillId === input.skillId);
  if (!isMastered(card)) return { error: "This set opens after the skill is mastered." };

  const { error } = await session.supabase.from("go_further_sets").upsert(
    {
      child_id: input.childId,
      skill_id: input.skillId,
      asked: input.asked,
      correct: input.correct,
      completed_at: new Date().toISOString(),
    },
    { onConflict: "child_id,skill_id" },
  );
  if (!error) return {};
  if (goFurtherTableMissing(error)) return { error: "Go further can be saved once the database is updated." };
  return { error: friendlyDbError(error) };
}
