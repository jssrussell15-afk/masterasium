import "server-only";

import { cookies } from "next/headers";
import { currentStudentId } from "@/lib/auth/student-client";
import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";
import { roleFromSession, type Role } from "@/lib/auth/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type HeaderSession = {
  role: Role | "public";
  signedIn: boolean;
};

/** The role the header should show. A live student session wins over a parent session. */
export async function readHeaderSession(): Promise<HeaderSession> {
  let token = "";
  try {
    const store = await cookies();
    token = store.get(STUDENT_COOKIE)?.value?.trim() ?? "";
  } catch {
    return { role: "public", signedIn: false };
  }

  if (token) {
    try {
      const childId = await currentStudentId(token);
      if (childId) return { role: "student", signedIn: true };
    } catch {
      // Fail closed. A broken student check is not a session; a parent may still be signed in.
    }
  }

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
