import { cookies } from "next/headers";
import { studentCookieOptions } from "@/lib/auth/student-cookie";

export const DEVICE_COOKIE = "masterasium_device";

const DEVICE_KEY = /^[a-z0-9]{16,64}$/;

export function newDeviceKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Stable id for this browser. Used only to rate-limit PIN and practice-set guesses. */
export async function ensureDeviceKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value?.trim() ?? "";
  if (DEVICE_KEY.test(existing)) return existing;
  const key = newDeviceKey();
  try {
    store.set(DEVICE_COOKIE, key, studentCookieOptions());
  } catch {
    // Server Components cannot always write cookies. This request still sends the key.
  }
  return key;
}
