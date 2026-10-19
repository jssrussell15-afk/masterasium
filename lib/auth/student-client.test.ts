import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const created = vi.hoisted(() => ({
  options: null as { global?: { headers?: Record<string, string> } } | null,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, options: { global?: { headers?: Record<string, string> } }) => {
    created.options = options;
    return { rpc };
  },
}));

import { currentStudentId } from "@/lib/auth/student-client";

const CHILD_ID = "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c";

describe("currentStudentId", () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    created.options = null;
    rpc.mockReset();
  });

  afterEach(() => {
    if (previous.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
    if (previous.key === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.key;
  });

  it("returns a child id only when the token is a live session", async () => {
    rpc.mockResolvedValue({ data: CHILD_ID, error: null });
    await expect(currentStudentId("  token-1  ")).resolves.toBe(CHILD_ID);
    expect(rpc).toHaveBeenCalledWith("current_student_id");
    expect(created.options?.global?.headers).toEqual({ "x-student-token": "token-1" });
  });

  it("fails closed when the check is empty, errors, or throws", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(currentStudentId("token")).resolves.toBeNull();

    rpc.mockResolvedValueOnce({ data: "", error: null });
    await expect(currentStudentId("token")).resolves.toBeNull();

    rpc.mockResolvedValueOnce({ data: null, error: { message: "db down" } });
    await expect(currentStudentId("token")).resolves.toBeNull();

    rpc.mockRejectedValueOnce(new Error("network"));
    await expect(currentStudentId("token")).resolves.toBeNull();

    rpc.mockClear();
    await expect(currentStudentId("   ")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("fails closed when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(currentStudentId("token")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});
