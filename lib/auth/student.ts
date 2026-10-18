import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { friendlyDbError, isGradeProgressMissing } from "@/lib/db-error";
import { STUDENT_COOKIE, studentCookieOptions } from "@/lib/auth/student-cookie";
import { isSupabaseConfigured, requireSupabaseEnv } from "@/lib/supabase/env";

export type StudentChild = {
  id: string;
  first_name: string;
  grade: number;
  working_grade: number | null;
  next_grade_unlocked: boolean;
  requested_grade: number | null;
};

export function createAnonClient(deviceKey?: string | null): SupabaseClient {
  const { url, key } = requireSupabaseEnv();
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: deviceHeaders(deviceKey),
  });
}

export function createStudentClient(token: string, deviceKey?: string | null): SupabaseClient {
  const { url, key } = requireSupabaseEnv();
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-student-token": token,
        ...(deviceKey ? { "x-device-key": deviceKey } : {}),
      },
    },
  });
}

function deviceHeaders(deviceKey?: string | null): { headers: { "x-device-key": string } } | undefined {
  if (!deviceKey) return undefined;
  return { headers: { "x-device-key": deviceKey } };
}

export async function readStudentToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(STUDENT_COOKIE)?.value?.trim();
  return value || null;
}

export async function revokeStudentToken(token: string | null): Promise<void> {
  if (!token || !isSupabaseConfigured()) return;
  const student = createStudentClient(token);
  await student.rpc("end_student_session");
}

export async function clearStudentCookie(): Promise<void> {
  const store = await cookies();
  store.set(STUDENT_COOKIE, "", studentCookieOptions(0));
}

export async function endStudentSession(): Promise<void> {
  await revokeStudentToken(await readStudentToken());
  await clearStudentCookie();
}

export async function requireStudent(): Promise<
  { supabase: SupabaseClient; child: StudentChild } | { error: string }
> {
  if (!isSupabaseConfigured()) redirect("/setup");

  const token = await readStudentToken();
  if (!token) redirect("/login?as=student");

  const supabase = createStudentClient(token);
  const full = await supabase
    .from("children")
    .select("id, first_name, grade, working_grade, next_grade_unlocked, requested_grade")
    .maybeSingle();

  let data = full.data;
  let error = full.error;
  if (error && isGradeProgressMissing(error)) {
    const basic = await supabase.from("children").select("id, first_name, grade").maybeSingle();
    data = basic.data
      ? {
          ...basic.data,
          working_grade: null,
          next_grade_unlocked: false,
          requested_grade: null,
        }
      : null;
    error = basic.error;
  }

  if (error) return { error: friendlyDbError(error) };
  if (!data) {
    return { error: "That student session ended. Sign out and sign in again." };
  }

  return { supabase, child: data as StudentChild };
}
