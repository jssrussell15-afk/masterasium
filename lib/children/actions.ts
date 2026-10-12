"use server";

import { redirect } from "next/navigation";
import { friendlyDbError } from "@/lib/db-error";
import { isSupportedGrade } from "@/lib/grades";
import { requireUser } from "@/lib/auth/session";
import { isValidFirstName, normalizeFirstName } from "@/lib/validation";

export type ChildState = {
  error?: string;
};

export async function addChild(_previous: ChildState, formData: FormData): Promise<ChildState> {
  const { supabase, user } = await requireUser();
  const firstName = normalizeFirstName(String(formData.get("firstName") ?? ""));
  const grade = Number(formData.get("grade"));

  if (!isValidFirstName(firstName)) {
    return { error: "Use a first name, up to 40 letters." };
  }
  if (!isSupportedGrade(grade)) {
    return { error: "Grade 1 and Grade 5 are open. The other grades are not ready yet." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id" });
  if (profileError) return { error: friendlyDbError(profileError) };

  const { count, error: countError } = await supabase
    .from("children")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);
  if (countError) return { error: friendlyDbError(countError) };
  if ((count ?? 0) >= 2) return { error: "This account already has 2 children." };

  const { error } = await supabase.from("children").insert({
    parent_id: user.id,
    first_name: firstName,
    grade,
  });
  if (error) return { error: friendlyDbError(error) };
  redirect("/dashboard");
}
