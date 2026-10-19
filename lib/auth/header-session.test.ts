import { beforeEach, describe, expect, it, vi } from "vitest";

const jar = vi.hoisted(() => new Map<string, string>());
const student = vi.hoisted(() => ({
  id: null as string | null,
  throw: false,
}));
const parent = vi.hoisted(() => ({
  claims: false,
  throw: false,
}));
const cookiesThrow = vi.hoisted(() => ({ value: false }));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (cookiesThrow.value) throw new Error("cookies unavailable");
    return {
      get(name: string) {
        const value = jar.get(name);
        return value === undefined ? undefined : { name, value };
      },
    };
  },
}));

vi.mock("@/lib/auth/student-client", () => ({
  currentStudentId: async () => {
    if (student.throw) throw new Error("student check failed");
    return student.id;
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    if (parent.throw) throw new Error("parent check failed");
    return {
      auth: {
        getClaims: async () => ({ data: parent.claims ? { claims: { sub: "parent" } } : null }),
      },
    };
  },
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
}));

import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";
import { readHeaderSession } from "@/lib/auth/header-session";

describe("readHeaderSession", () => {
  beforeEach(() => {
    jar.clear();
    student.id = null;
    student.throw = false;
    parent.claims = false;
    parent.throw = false;
    cookiesThrow.value = false;
  });

  it("treats a student cookie as signed in only when it resolves to a child", async () => {
    jar.set(STUDENT_COOKIE, "token");
    student.id = "child-1";
    parent.claims = true;
    await expect(readHeaderSession()).resolves.toEqual({ role: "student", signedIn: true });
  });

  it("fails closed when the student check misses or throws, then allows a parent", async () => {
    jar.set(STUDENT_COOKIE, "stale");
    await expect(readHeaderSession()).resolves.toEqual({ role: "public", signedIn: false });

    parent.claims = true;
    await expect(readHeaderSession()).resolves.toEqual({ role: "parent", signedIn: true });

    student.throw = true;
    parent.claims = false;
    await expect(readHeaderSession()).resolves.toEqual({ role: "public", signedIn: false });
  });

  it("stays signed out when cookies or the parent check throw", async () => {
    cookiesThrow.value = true;
    jar.set(STUDENT_COOKIE, "token");
    student.id = "child-1";
    await expect(readHeaderSession()).resolves.toEqual({ role: "public", signedIn: false });

    cookiesThrow.value = false;
    student.id = null;
    parent.throw = true;
    await expect(readHeaderSession()).resolves.toEqual({ role: "public", signedIn: false });
  });
});
