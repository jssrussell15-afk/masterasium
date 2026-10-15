"use server";

import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export type SampleState = {
  error?: string;
  ready?: boolean;
  saved?: boolean;
  note?: string;
};

export async function requestSample(
  _previous: SampleState,
  formData: FormData,
): Promise<SampleState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const province = String(formData.get("province") ?? "").trim();
  const grade = Number(formData.get("grade") ?? "");
  const consent = String(formData.get("consent") ?? "") === "yes";

  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (!consent) return { error: "Check the box to agree before the samples open." };
  if (!province || !Number.isInteger(grade) || grade < 1 || grade > 8) {
    return { error: "Choose a grade page and try again." };
  }

  if (!isSupabaseConfigured()) {
    return {
      ready: true,
      saved: false,
      note: "Your email was not saved. The samples are still ready to print.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sample_requests").insert({
    email,
    province,
    grade,
    consent: true,
  });

  if (error) {
    const missing = error.message.toLowerCase().includes("sample_requests");
    return {
      ready: true,
      saved: false,
      note: missing
        ? "Your email was not saved yet. The samples are still ready to print."
        : "Your email was not saved. The samples are still ready to print.",
    };
  }

  return {
    ready: true,
    saved: true,
    note: "Email saved. The samples are ready to print.",
  };
}
