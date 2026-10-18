import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearBrowserAuthCookieAssignments } from "@/lib/auth/browser-cookies";
import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";

const jar = vi.hoisted(() => new Map<string, string>());
const redirects = vi.hoisted(() => [] as string[]);

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = jar.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll() {
      return [...jar.entries()].map(([name, value]) => ({ name, value }));
    },
    set(name: string, value: string, options?: { maxAge?: number }) {
      if (!value || options?.maxAge === 0) jar.delete(name);
      else jar.set(name, value);
    },
  }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  redirect(url: string) {
    redirects.push(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

import { signOut } from "@/lib/auth/actions";

describe("sign out", () => {
  beforeEach(() => {
    jar.clear();
    redirects.length = 0;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it("clears the parent session and the student cookie, then goes home", async () => {
    jar.set(STUDENT_COOKIE, "student-token");
    jar.set("sb-project-auth-token", "session");
    jar.set("sb-project-auth-token.0", "chunk");

    await expect(signOut()).rejects.toThrow("REDIRECT:/");

    expect(redirects).toEqual(["/"]);
    expect(jar.has(STUDENT_COOKIE)).toBe(false);
    expect(jar.has("sb-project-auth-token")).toBe(false);
    expect(jar.has("sb-project-auth-token.0")).toBe(false);
    expect(redirects).not.toContain("/dashboard");
    expect(redirects).not.toContain("/login?as=student");
  });

  it("expires supabase cookies the browser can see", () => {
    const lines = clearBrowserAuthCookieAssignments(
      "sb-project-auth-token=abc; theme=light; masterasium_student=tok",
    );
    expect(lines.some((line) => line.startsWith("sb-project-auth-token=;"))).toBe(true);
    expect(lines.some((line) => line.includes("Secure"))).toBe(true);
    expect(lines.some((line) => line.startsWith("masterasium_student=;"))).toBe(true);
    expect(lines.join("\n")).not.toContain("theme=");
  });
});
