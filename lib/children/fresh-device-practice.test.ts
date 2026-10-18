import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PracticeSession } from "@/components/practice-session";
import { StudentLoginForm } from "@/components/student-login-form";
import { readRememberedChildren, TABLET_CHILDREN_COOKIE } from "@/lib/children/tablet";
import { issueQuestion } from "@/lib/practice/session";
import type { PracticeView, QuestionView } from "@/lib/practice/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const CHILD_ID = "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c";
const TOKEN = "ab".repeat(32);

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

vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({
    user: { id: "parent-1" },
    supabase: {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle: async () => ({
            data: { id: CHILD_ID, first_name: "Sam" },
            error: null,
          }),
        };
      },
    },
  }),
  ensureProfile: async () => null,
}));

vi.mock("@/lib/auth/student", () => ({
  createAnonClient: () => ({
    rpc: async () => ({ data: TOKEN, error: null }),
  }),
  createStudentClient: () => ({
    from: () => ({
      select: () => ({
        maybeSingle: async () => ({ data: { id: CHILD_ID }, error: null }),
      }),
    }),
    rpc: async () => ({ error: null }),
  }),
  readStudentToken: async () => null,
  revokeStudentToken: async () => {},
  endStudentSession: async () => {},
  clearStudentCookie: async () => {},
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signOut: async () => ({ error: null }),
    },
  }),
}));

import { signInStudent } from "@/lib/auth/actions";
import { startPracticeOnDevice } from "@/lib/children/actions";
import { STUDENT_COOKIE } from "@/lib/auth/student-cookie";

function memorySupabase(): SupabaseClient {
  return {
    from(table: string) {
      let op = "select";
      let row: Record<string, unknown> | null = null;
      const chain = {
        select() {
          return chain;
        },
        eq() {
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        delete() {
          op = "delete";
          return chain;
        },
        insert(value: Record<string, unknown>) {
          op = "insert";
          row = value;
          return chain;
        },
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => {
          if (table !== "pending_questions" || op !== "insert" || !row) {
            return { data: null, error: { message: "missing" } };
          }
          return { data: { id: "question-1", ...row }, error: null };
        },
        then(resolve: (value: { error: null }) => unknown, reject?: (reason: unknown) => unknown) {
          return Promise.resolve({ error: null }).then(resolve, reject);
        },
      };
      return chain;
    },
  } as unknown as SupabaseClient;
}

function practiceView(question: QuestionView): PracticeView {
  return {
    childId: CHILD_ID,
    childName: "Sam",
    grade: 3,
    access: { enrolled: 3, working: 3, nextUnlocked: false, requested: null },
    question,
    attempted: 0,
    correct: 0,
    focusTitle: question.skillTitle,
    skills: [],
    recap: null,
    requestedGrade: null,
    today: "2026-10-18",
  };
}

describe("fresh device practice", () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  beforeEach(() => {
    jar.clear();
    redirects.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  afterAll(() => {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey;
  });

  it("saves the child, shows their name and PIN pad, then opens a practice question", async () => {
    expect(readRememberedChildren(undefined)).toEqual([]);

    const start = new FormData();
    start.set("childId", CHILD_ID);
    await expect(startPracticeOnDevice({}, start)).rejects.toThrow("REDIRECT:/login?as=student");
    expect(redirects).toEqual(["/login?as=student"]);

    const saved = readRememberedChildren(jar.get(TABLET_CHILDREN_COOKIE));
    expect(saved).toEqual([{ id: CHILD_ID, firstName: "Sam" }]);

    const login = renderToStaticMarkup(createElement(StudentLoginForm, { students: saved }));
    expect(login).toContain(">Sam<");
    expect(login).toContain('class="pin-pad"');
    expect(login).toContain('name="firstName"');
    expect(login).not.toContain(">First name<");
    expect(login).not.toContain("No student is saved on this tablet yet.");

    redirects.length = 0;
    const pin = new FormData();
    pin.set("firstName", "Sam");
    pin.set("pin", "1234");
    await expect(signInStudent({}, pin)).rejects.toThrow(`REDIRECT:/practice/${CHILD_ID}`);
    expect(jar.get(STUDENT_COOKIE)).toBe(TOKEN);

    const issued = await issueQuestion(memorySupabase(), CHILD_ID, 3, []);
    expect(issued.error).toBeNull();
    expect(issued.question?.prompt.length).toBeGreaterThan(0);
    const question = issued.question;
    if (!question) throw new Error("A practice question was not issued.");

    const screen = renderToStaticMarkup(
      createElement(PracticeSession, {
        view: practiceView({ ...question, intro: undefined }),
      }),
    );
    expect(screen).toContain(question.prompt);
    expect(screen).toContain(">Check<");
    expect(screen).toContain('class="question-screen"');
    expect(screen).not.toContain("streak");
  });
});
