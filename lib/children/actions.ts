"use server";

import { redirect } from "next/navigation";
import { friendlyDbError } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import {
  isValidFirstName,
  isValidPin,
  isValidUsername,
  normalizeFirstName,
  normalizeUsername,
} from "@/lib/validation";

export type ChildState = {
  error?: string;
};

function pinFields(formData: FormData): { pin: string } | { error: string } {
  const pin = String(formData.get("pin") ?? "").trim();
  const confirm = String(formData.get("confirmPin") ?? "").trim();
  if (!isValidPin(pin)) return { error: "Use a PIN of 4 to 6 digits." };
  if (pin !== confirm) return { error: "Those PINs do not match." };
  return { pin };
}

export async function addChild(_previous: ChildState, formData: FormData): Promise<ChildState> {
  const { supabase, user } = await requireUser();
  const firstName = normalizeFirstName(String(formData.get("firstName") ?? ""));
  const grade = Number(formData.get("grade"));
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const pin = pinFields(formData);

  if (!isValidFirstName(firstName)) {
    return { error: "Use a first name, up to 40 letters." };
  }
  if (!isSupportedGrade(grade)) {
    return { error: "Choose a grade from 1 to 8." };
  }
  if (!isValidUsername(username)) {
    return { error: "Use 3 to 20 letters or numbers, with no spaces." };
  }
  if ("error" in pin) return { error: pin.error };

  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) return { error: friendlyDbError(profileError) };

  const { count, error: countError } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);
  if (countError) return { error: friendlyDbError(countError) };
  if ((count ?? 0) >= 2) return { error: "This account already has 2 children." };

  const { error } = await supabase.rpc("create_child_profile", {
    p_first_name: firstName,
    p_grade: grade,
    p_username: username,
    p_pin: pin.pin,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect("/dashboard");
}

export async function setStudentLogin(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const pin = pinFields(formData);

  if (!childId) return { error: "Choose a child first." };
  if (!isValidUsername(username)) {
    return { error: "Use 3 to 20 letters or numbers, with no spaces." };
  }
  if ("error" in pin) return { error: pin.error };

  const { error } = await supabase.rpc("set_student_login", {
    p_child_id: childId,
    p_username: username,
    p_pin: pin.pin,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect("/settings?notice=login");
}

export async function resetStudentPin(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const pin = pinFields(formData);

  if (!childId) return { error: "Choose a child first." };
  if ("error" in pin) return { error: pin.error };

  const { error } = await supabase.rpc("reset_student_pin", {
    p_child_id: childId,
    p_pin: pin.pin,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect("/settings?notice=pin");
}

export async function setNextGradeUnlock(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const unlocked = String(formData.get("unlocked") ?? "") === "1";
  if (!childId) return { error: "Choose a child first." };

  const { error } = await supabase.rpc("set_next_grade_unlock", {
    p_child_id: childId,
    p_unlocked: unlocked,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect("/settings?notice=grade");
}

export async function decideGradeRequest(
  _previous: ChildState,
  formData: FormData,
): Promise<ChildState> {
  const { supabase } = await requireUser();
  const childId = String(formData.get("childId") ?? "");
  const approve = String(formData.get("approve") ?? "") === "1";
  if (!childId) return { error: "Choose a child first." };

  const { error } = await supabase.rpc("decide_grade_request", {
    p_child_id: childId,
    p_approve: approve,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect(approve ? "/settings?notice=grade-approved" : "/settings?notice=grade-declined");
}
