import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const calls = vi.hoisted(() => ({ n: 0, id: null as string | null, throw: false }));
const parent = vi.hoisted(() => ({ claims: false }));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getClaims: async () => ({ data: parent.claims ? { claims: { sub: "parent" } } : null }),
    },
  }),
}));

vi.mock("@/lib/auth/student-client", () => ({
  currentStudentId: async () => {
    calls.n += 1;
    if (calls.throw) throw new Error("student check failed");
    return calls.id;
  },
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
  requireSupabaseEnv: () => ({ url: "https://example.supabase.co", key: "anon" }),
}));

import { updateSession } from "@/lib/supabase/proxy";

function request(path: string, cookie = false) {
  const headers = new Headers();
  if (cookie) headers.set("cookie", "masterasium_student=tok");
  return new NextRequest(new URL(path, "https://masterasium.test"), { headers });
}

describe("login and signup student redirect", () => {
  beforeEach(() => {
    calls.n = 0;
    calls.id = null;
    calls.throw = false;
    parent.claims = false;
  });

  it("sends a live student away from login and signup, and stays put when the token is dead", async () => {
    calls.id = "child-1";
    const login = await updateSession(request("/login", true));
    expect(login.headers.get("location")).toContain("/practice");
    expect(calls.n).toBe(1);

    const signup = await updateSession(request("/signup", true));
    expect(signup.headers.get("location")).toContain("/practice");
    expect(calls.n).toBe(2);

    calls.id = null;
    const stale = await updateSession(request("/login", true));
    expect(stale.status).toBe(200);
    expect(stale.headers.get("location")).toBeNull();

    calls.throw = true;
    const broken = await updateSession(request("/signup", true));
    expect(broken.status).toBe(200);
    expect(broken.headers.get("location")).toBeNull();
  });

  it("does not call current_student_id on other routes", async () => {
    const practice = await updateSession(request("/practice", true));
    expect(practice.status).toBe(200);
    const desk = await updateSession(request("/dashboard", true));
    expect(desk.headers.get("location")).toContain("/practice");
    const home = await updateSession(request("/", true));
    expect(home.status).toBe(200);
    expect(calls.n).toBe(0);
  });

  it("lets a parent through login when the student cookie is not a session", async () => {
    parent.claims = true;
    const login = await updateSession(request("/login", true));
    expect(login.headers.get("location")).toContain("/dashboard");
    expect(calls.n).toBe(1);
  });
});
