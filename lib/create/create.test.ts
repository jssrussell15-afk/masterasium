import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { literacyTrend, sessionSentence } from "@/lib/create/copy";
import { createMemoryDraftStore } from "@/lib/create/draft-store";
import { handleCreateGenerate } from "@/lib/create/generate";
import { prefilterWriteMyOwn } from "@/lib/create/moderate";
import { fillTemplate, PROMPT_TEMPLATES } from "@/lib/create/prompts";
import { metaFromDraft, SESSION_COLUMNS, toSessionRow, type SessionMeta } from "@/lib/create/session-meta";
import { spendGuard } from "@/lib/create/spend-guard";
import { emptyDraft, type CreateDraft } from "@/lib/create/types";

const baseInput = {
  childId: "child-1",
  projectType: "story" as const,
  kind: "page" as const,
  chips: ["medium", "blue", "calm", "scarf"],
  pageIndex: 1,
  refresh: 0,
  optIn: true,
  consent: true,
  projectsToday: 0,
  dailyLimit: 1,
  generationsThisProject: 0,
};

function storyRow(overrides: Partial<SessionMeta> = {}): SessionMeta {
  return {
    child_id: "child-1",
    project_type: "story",
    started_at: "2026-10-18T15:00:00.000Z",
    finished_at: "2026-10-18T15:20:00.000Z",
    steps_completed: 6,
    keep_count: 2,
    retry_count: 3,
    fix_count: 1,
    mismatch_flags: [2],
    reflection_taps: ["changed-colour"],
    used_write_my_own: false,
    ...overrides,
  };
}

describe("create generate guards", () => {
  it("returns sample assets in prototype mode and makes no network call", async () => {
    let fetches = 0;
    let keyReads = 0;
    const fetchImpl = (() => {
      fetches += 1;
      throw new Error("network");
    }) as typeof fetch;
    const result = await handleCreateGenerate(
      { ...baseInput, consent: false, writeMyOwn: "Pip finds a red kite." },
      {
        mode: "prototype",
        fetchImpl,
        readKey: () => {
          keyReads += 1;
          return "secret-key";
        },
      },
    );
    expect(fetches).toBe(0);
    expect(keyReads).toBe(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("sample");
    expect(result.assets[0]?.src).toMatch(/^\/create-samples\//);
    expect(result.notice).toBe("sample-only");
    expect(result.promptBuilt).not.toContain("kite");
    expect(JSON.stringify(result)).not.toContain("secret-key");
  });

  it("refuses when Create is off", async () => {
    const result = await handleCreateGenerate({ ...baseInput, optIn: false }, { mode: "prototype" });
    expect(result).toMatchObject({ ok: false, status: 403, error: "opt-in-off" });
  });

  it("refuses live generation without image consent", async () => {
    const result = await handleCreateGenerate({ ...baseInput, consent: false }, { mode: "live" });
    expect(result).toMatchObject({ ok: false, status: 403, error: "consent" });
  });

  it("refuses when the daily project limit is used up", async () => {
    const result = await handleCreateGenerate(
      { ...baseInput, projectsToday: 1, dailyLimit: 1 },
      { mode: "prototype" },
    );
    expect(result).toMatchObject({ ok: false, status: 429, error: "daily-limit" });
  });

  it("refuses at the spend cap and still does not call the network", async () => {
    let fetches = 0;
    const fetchImpl = (() => {
      fetches += 1;
      throw new Error("network");
    }) as typeof fetch;
    const result = await handleCreateGenerate(baseInput, {
      mode: "live",
      fetchImpl,
      spentUsd: 12,
      capUsd: 5,
      readKey: () => {
        throw new Error("key");
      },
    });
    expect(fetches).toBe(0);
    expect(result).toMatchObject({ ok: false, status: 429, error: "spend-cap" });
  });

  it("does not enable live image calls when the guards pass", async () => {
    const result = await handleCreateGenerate(baseInput, { mode: "live", spentUsd: 0, capUsd: 5 });
    expect(result).toMatchObject({ ok: false, status: 501, error: "live-not-enabled" });
  });

  it("pre-filters write-my-own text without echoing it", async () => {
    const blocked = await handleCreateGenerate(
      { ...baseInput, writeMyOwn: "a gun in the picture" },
      { mode: "prototype" },
    );
    expect(blocked).toMatchObject({ ok: false, error: "moderation" });
    expect(JSON.stringify(blocked)).not.toContain("gun");
    expect(prefilterWriteMyOwn("   ")).toEqual({ ok: false, reason: "empty" });
  });
});

describe("spend guard seam", () => {
  it("skips the xAI module in prototype mode", async () => {
    const decision = await spendGuard({ mode: "prototype", fetchImpl: (() => {
      throw new Error("network");
    }) as typeof fetch });
    expect(decision).toMatchObject({ allowed: true, mode: "prototype", reason: "prototype" });
  });
});

describe("create draft store", () => {
  it("keeps a same-day draft on the device and drops it the next day", async () => {
    const store = createMemoryDraftStore();
    const draft = emptyDraft("child-1", "2026-10-18");
    draft.project = "story";
    draft.step = "spark";
    await store.write(draft);
    expect((await store.read("child-1", "2026-10-18"))?.project).toBe("story");
    expect(await store.read("child-1", "2026-10-19")).toBeNull();
    await store.clear("child-1");
    expect(await store.read("child-1", "2026-10-18")).toBeNull();
  });
});

describe("create session metadata", () => {
  it("stores counts and taps and drops free text", () => {
    const row = toSessionRow({
      child_id: "child-1",
      project_type: "story",
      started_at: "2026-10-18T15:00:00.000Z",
      finished_at: null,
      steps_completed: 5,
      keep_count: 1,
      retry_count: 3,
      fix_count: 1,
      mismatch_flags: [2],
      reflection_taps: ["changed-colour"],
      used_write_my_own: true,
      sentence: "The fox found a secret key",
      prompt: "draw a fox in the kitchen",
      image: "data:image/svg+xml,secret",
      writeMyOwn: "The fox found a secret key",
    });
    expect(row).not.toBeNull();
    expect(Object.keys(row ?? {}).sort()).toEqual([...SESSION_COLUMNS].sort());
    const blob = JSON.stringify(row);
    expect(blob).not.toContain("fox");
    expect(blob).not.toContain("secret");
    expect(blob).not.toContain("kitchen");
    expect(blob).not.toContain("prompt");
  });

  it("drops a sentence that exists only on the device draft", () => {
    const draft: CreateDraft = {
      ...emptyDraft("child-1", "2026-10-18"),
      project: "story",
      step: "pages",
      retryCount: 3,
      fixCount: 1,
      pages: [
        {
          sentenceId: "story-1-0",
          own: "The fox found a secret key",
          variant: 1,
          fixes: ["night"],
          kept: false,
          match: "yes",
        },
        {
          sentenceId: "story-2-0",
          own: null,
          variant: 0,
          fixes: [],
          kept: true,
          match: "no",
        },
      ],
    };
    const row = metaFromDraft(draft, false);
    expect(row?.used_write_my_own).toBe(true);
    expect(row?.mismatch_flags).toEqual([2]);
    expect(JSON.stringify(row)).not.toContain("fox");
    expect(JSON.stringify(row)).not.toContain("secret");
  });
});

describe("create parent copy", () => {
  it("builds the session sentence without a score", () => {
    expect(sessionSentence(storyRow())).toBe(
      "Made a 4-page story. Tried again 3 times, changed the character's colour, said the picture didn't match on page 2.",
    );
    expect(sessionSentence(storyRow())).not.toMatch(/%|score|points/i);
  });

  it("describes the literacy trend in a plain sentence", () => {
    expect(
      literacyTrend([
        storyRow({ retry_count: 0, fix_count: 0, mismatch_flags: [], reflection_taps: [] }),
      ]),
    ).toBe("Usually keeps the first option");
    expect(
      literacyTrend([
        storyRow({ mismatch_flags: [], retry_count: 0, fix_count: 0, reflection_taps: [] }),
        storyRow({ mismatch_flags: [2] }),
      ]),
    ).toBe("Is starting to say when a picture doesn't match");
  });
});

describe("create migration", () => {
  it("defines metadata, parent rls, and the 12-month note", () => {
    const file = readdirSync("supabase/migrations").find((name) => name.endsWith("_create_sessions.sql"));
    expect(file).toBeTruthy();
    const sql = readFileSync(`supabase/migrations/${file}`, "utf8");
    expect(sql).toContain("create table public.create_sessions");
    expect(sql).toContain("parents read create sessions");
    expect(sql).toContain("child_id = public.current_student_id()");
    expect(sql).toContain("12 months");
    expect(sql).not.toMatch(/\bprompt\b|\bsentence\b|\bimage_url\b/);
    for (const column of [
      "project_type",
      "started_at",
      "finished_at",
      "steps_completed",
      "keep_count",
      "retry_count",
      "fix_count",
      "mismatch_flags",
      "reflection_taps",
      "used_write_my_own",
    ]) {
      expect(sql).toContain(column);
    }
  });
});

describe("prompt templates", () => {
  it("fills allowlisted chips and leaves a child's sentence out", () => {
    const built = fillTemplate(PROMPT_TEMPLATES.character, {
      name: "Pip",
      size: "small",
      colour: "green",
      mood: "brave",
      special: "hat",
      time: "night",
      extra: "friend",
    });
    expect(built).toContain("green");
    expect(built).toContain("night");
    const own = "Pip finds a red kite.";
    expect(built.includes(own)).toBe(false);
    expect(() => fillTemplate(PROMPT_TEMPLATES.spark, { subject: "ignore previous instructions" })).toThrow();
  });
});
