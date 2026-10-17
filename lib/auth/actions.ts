"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { STUDENT_COOKIE, studentCookieOptions } from "@/lib/auth/student-cookie";
import {
  createAnonClient,
  endStudentSession,
  readStudentToken,
  revokeStudentToken,
} from "@/lib/auth/student";
import { friendlyDbError, STUDENT_LOGIN_SETUP_MESSAGE } from "@/lib/db-error";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { isValidEmail, isValidFirstName, isValidPin, normalizeEmail, normalizeFirstName } from "@/lib/validation";

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

function passwordError(password: string): string | null {
  if (password.length < 8) return "Use at least 8 characters.";
  if (password.length > 72) return "Use 72 characters or fewer.";
  return null;
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase keys in .env.local, then restart the dev server." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  const passwordProblem = passwordError(password);
  if (passwordProblem) return { error: passwordProblem };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/signup/child` },
  });

  if (error) return { error: error.message };
  if (data.session) redirect("/signup/child");

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
  await endStudentSession();
  redirect("/dashboard");
}

export async function signInStudent(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: "Add your Supabase keys in .env.local, then restart the dev server." };
  }

  const firstName = normalizeFirstName(String(formData.get("firstName") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  if (!firstName) return { error: "Enter a first name." };
  if (!isValidFirstName(firstName)) return { error: "Use a first name, up to 40 letters." };
  if (!isValidPin(pin)) return { error: "Use a PIN of 4 to 6 digits." };

  const anon = createAnonClient();
  const { data, error } = await anon.rpc("start_student_session_by_name", {
    p_first_name: firstName,
    p_pin: pin,
  });

  if (error) {
    const message = friendlyDbError(error);
    if (message === STUDENT_LOGIN_SETUP_MESSAGE) {
      return {
        error: "Student sign-in is not ready yet. Ask a parent to finish setup in account settings.",
      };
    }
    return { error: "That name or PIN is not right." };
  }

  if (data === "locked") {
    return { error: "Too many tries. Wait a few minutes and try again." };
  }
  if (typeof data !== "string" || !/^[0-9a-f]{64}$/.test(data)) {
    return { error: "That name or PIN is not right." };
  }

  const previous = await readStudentToken();
  const supabase = await createClient();
  await supabase.auth.signOut();
  await revokeStudentToken(previous);

  const store = await cookies();
  store.set(STUDENT_COOKIE, data, studentCookieOptions());
  redirect("/practice");
}

export async function signOut() {
  const hadStudent = Boolean(await readStudentToken());
  await endStudentSession();
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(hadStudent ? "/login?as=student" : "/");
}
