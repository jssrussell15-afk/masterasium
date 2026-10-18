import "server-only";

import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/** Expires every Supabase auth cookie this request can see, then asks Auth to drop the local session. */
export async function clearSupabaseSession(): Promise<void> {
  const store = await cookies();
  const names = new Set(
    store
      .getAll()
      .map((cookie) => cookie.name)
      .filter((name) => name.startsWith("sb-")),
  );

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // A failed revoke must not keep the cookies. The expiry below still signs the browser out.
    }
  }

  for (const cookie of store.getAll()) {
    if (cookie.name.startsWith("sb-")) names.add(cookie.name);
  }

  for (const name of names) {
    store.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
      httpOnly: false,
    });
  }
}
