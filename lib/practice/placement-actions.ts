"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { requireStudent } from "@/lib/auth/student";
import { signupPracticePath } from "@/lib/children/signup-practice";
import { friendlyDbError } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";
import { STRANDS, type StrandId } from "@/lib/curriculum/ontario";
import {
  outcomeFromMarks,
  parseMarks,
  startingPointAtGrade,
  startingPointAtStrand,
} from "@/lib/practice/placement";

export type PlacementState = {
  error?: string;
};

export async function finishPlacement(
  _previous: PlacementState,
  formData: FormData,
): Promise<PlacementState> {
  const session = await requireStudent();
  if ("error" in session) return { error: session.error };

  const childId = String(formData.get("childId") ?? "");
  if (childId !== session.child.id) return { error: "That practice session is not available." };
  if (!isSupportedGrade(session.child.grade)) return { error: "That grade is not open yet." };

  const marks = parseMarks(String(formData.get("marks") ?? ""));
  if (!marks) return { error: "Those answers could not be saved. Try the check again." };
  const outcome = outcomeFromMarks(session.child.grade, marks);
  if (!outcome) return { error: "Those answers could not be saved. Try the check again." };

  const { error } = await session.supabase.rpc("save_placement", {
    p_placed_grade: outcome.placedGrade,
    p_start_skill_id: outcome.startSkillId,
    p_topic: outcome.topic,
    p_ready_strand: outcome.readyStrand,
    p_early_stop: outcome.earlyStop,
    p_cleared_all: outcome.clearedAll,
    p_status: outcome.status,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect(signupPracticePath(childId));
}

function strandId(value: string): StrandId | null {
  return STRANDS.find((strand) => strand.id === value)?.id ?? null;
}

export async function setStartingPoint(
  _previous: PlacementState,
  formData: FormData,
): Promise<PlacementState> {
  const { supabase, user } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!childId) return { error: "Choose a child first." };

  const { data, error } = await supabase
    .from("children")
    .select("id, grade")
    .eq("id", childId)
    .eq("parent_id", user.id)
    .maybeSingle();
  if (error) return { error: friendlyDbError(error) };
  if (!data || !isSupportedGrade(data.grade)) return { error: "That child profile is not available." };

  const strand = strandId(String(formData.get("strand") ?? ""));
  const result =
    mode === "grade"
      ? startingPointAtGrade(data.grade)
      : mode === "strand" && strand
        ? startingPointAtStrand(data.grade, strand)
        : null;
  if (mode === "strand" && !strand) return { error: "Pick a topic from this grade." };
  if (!result) return { error: mode === "strand" ? "That topic is not in this grade." : "Choose a starting point." };

  const saved = await supabase.rpc("set_starting_point", {
    p_child_id: childId,
    p_start_skill_id: result.startSkillId,
    p_topic: result.topic,
  });
  if (saved.error) return { error: friendlyDbError(saved.error) };
  redirect(`/dashboard?notice=start&child=${childId}`);
}
