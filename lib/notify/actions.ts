"use server";

import { friendlyDbError } from "@/lib/db-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export type NotifyState = {
  error?: string;
  message?: string;
};

export async function joinNotifyList(
  _previous: NotifyState,
  formData: FormData,
): Promise<NotifyState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (!isSupabaseConfigured()) {
    return { error: "Email notify needs the Supabase keys in .env.local." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("notify_emails").insert({ email });
  if (error?.code === "23505") return { message: "You're already on the list." };
  if (error) return { error: friendlyDbError(error) };
  return { message: "You're on the list. We'll write when more grades open." };
}
