"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, normalizeEmail } from "@/lib/validation";

export type AuthState = {
  error?: string;
  message?: string;
};

async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}

function passwordError(password: string, confirm?: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 72) return "Use 72 characters or fewer.";
  if (confirm !== undefined && password !== confirm) return "Those passwords do not match.";
  return null;
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase keys in .env.local, then restart the dev server." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  const passwordProblem = passwordError(password, confirm);
  if (passwordProblem) return { error: passwordProblem };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) return { error: error.message };
  if (data.session) redirect("/dashboard");

  return {
    message:
      "Check your email to confirm the account, then sign in. Registration is free. For local testing you can turn off Confirm email in the Supabase Auth settings.",
  };
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase keys in .env.local, then restart the dev server." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  const passwordProblem = passwordError(password);
  if (passwordProblem) return { error: passwordProblem };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
