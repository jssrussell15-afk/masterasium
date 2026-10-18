import "server-only";

import { cookies } from "next/headers";
import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";
import { roleFromSession, type Role } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type HeaderSession = {
  role: Role | "public";
  signedIn: boolean;
};

/** The role the header should show. A student cookie wins over a parent session. */
export async function readHeaderSession(): Promise<HeaderSession> {
  let hasStudent = false;
  try {
    const store = await cookies();
    hasStudent = Boolean(store.get(STUDENT_COOKIE)?.value);
  } catch {
    return { role: "public", signedIn: false };
  }

  if (hasStudent) return { role: "student", signedIn: true };

  if (!isSupabaseConfigured()) return { role: "public", signedIn: false };

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const role = roleFromSession({ hasStudent: false, hasParent: Boolean(data?.claims) });
    return { role: role ?? "public", signedIn: role != null };
  } catch {
    return { role: "public", signedIn: false };
  }
}
