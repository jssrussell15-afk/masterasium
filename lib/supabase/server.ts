import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureDeviceKey } from "@/lib/auth/device-key";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();
  const deviceKey = await ensureDeviceKey();

  return createServerClient(url, key, {
    global: {
      headers: { "x-device-key": deviceKey },
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies. The proxy refreshes the session.
        }
      },
    },
  });
}
