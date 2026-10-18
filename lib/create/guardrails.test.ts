import { describe, expect, it } from "vitest";
import { screenWriteMyOwn } from "@/lib/create/blocklist";
import { clientGeneratePayload, handleCreateGenerate, type GenerateContext, type GenerateInput } from "@/lib/create/generate";
import { createAccessDecision, parentHolderDecision } from "@/lib/create/gate";
import { CREATE_PAUSE_MESSAGE, KID_SAFETY_MESSAGE, type SafetyFilter } from "@/lib/create/moderate";
import { CREATE_SYSTEM_PROMPT, CREATE_SYSTEM_PROMPT_VERSION } from "@/lib/create/prompts";
import { hashIp, MAX_GENERATIONS_PER_PROJECT, MAX_IP_GENERATIONS_PER_DAY, MAX_MODERATION_BLOCKS_PER_DAY, MAX_PARENT_PROJECTS_PER_DAY } from "@/lib/create/rate-limit";
import { inspectTransport, parseGenerateBody } from "@/lib/create/schema";
import { parentCopy } from "@/lib/create/copy";

const input: GenerateInput = {
  childId: "child-1",
  projectType: "story",
  kind: "page",
  cardId: "story-1-0",
  chips: { colour: "green" },
  pageIndex: 1,
};

const context: GenerateContext = {
  optIn: true,
  consent: false,
  projectsToday: 0,
  dailyProjectLimit: 1,
  generationsThisProject: 0,
  moderationBlocksToday: 0,
  parentProjectsToday: 0,
  ipGenerationsToday: 0,
};

describe("create allowlist", () => {
  it("rejects prompt text, unknown chips, and ids outside the list", () => {
    expect(parseGenerateBody({ ...input, prompt: "draw anything you like" }).ok).toBe(false);
    expect(parseGenerateBody({ ...input, system: CREATE_SYSTEM_PROMPT }).ok).toBe(false);
    expect(parseGenerateBody({ ...input, chips: { size: "huge" } }).ok).toBe(false);
    expect(parseGenerateBody({ ...input, cardId: "mickey" }).ok).toBe(false);
    expect(parseGenerateBody(input).ok).toBe(true);
  });
});

describe("create blocklist", () => {
  it("normalizes leetspeak and spacing, and catches personal info", () => {
    expect(screenWriteMyOwn("Pip finds a red kite.")).toEqual({ ok: true });
    expect(screenWriteMyOwn("g u n")).toMatchObject({ ok: false, category: "violence" });
    expect(screenWriteMyOwn("h4te")).toMatchObject({ ok: false, category: "hate" });
    expect(screenWriteMyOwn("sam@school.com")).toMatchObject({ ok: false, category: "personal" });
    expect(screenWriteMyOwn("Call 555-123-4567 now")).toMatchObject({ ok: false, category: "personal" });
    expect(screenWriteMyOwn("12 King Street")).toMatchObject({ ok: false, category: "personal" });
    expect(screenWriteMyOwn("Sam Smith")).toMatchObject({ ok: false, category: "personal" });
    expect(screenWriteMyOwn("a".repeat(61))).toMatchObject({ ok: false, reason: "long" });
  });
});

describe("create uploads", () => {
  it("rejects multipart bodies and oversized json", () => {
    expect(inspectTransport({ contentType: "multipart/form-data; boundary=x", byteLength: 20 })).toMatchObject({
      ok: false,
      status: 415,
      error: "upload",
    });
    expect(inspectTransport({ contentType: "application/json", byteLength: 3000 })).toMatchObject({
      ok: false,
      status: 413,
      error: "too-large",
    });
    expect(inspectTransport({ contentType: "application/json", byteLength: 40 }).ok).toBe(true);
  });
});

describe("create moderation fail closed", () => {
  it("hides the picture and the reason when the filter throws", async () => {
    const safety: SafetyFilter = {
      check: async () => {
        throw new Error("vendor down");
      },
    };
    const result = await handleCreateGenerate(input, context, { mode: "prototype", safety });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.audit?.category).toBe("error");
    expect(result.audit?.moderationBlocksToday).toBe(1);
    expect(result.audit?.generationsThisProject).toBe(1);
    expect(clientGeneratePayload(result)).toEqual({
      ok: false,
      error: "safety",
      message: KID_SAFETY_MESSAGE,
    });
    expect(JSON.stringify(clientGeneratePayload(result))).not.toContain("vendor");
    expect(clientGeneratePayload(result)).not.toHaveProperty("audit");
  });

  it("fails closed when moderation times out", async () => {
    const safety: SafetyFilter = { check: () => new Promise(() => undefined) };
    const result = await handleCreateGenerate(input, context, { mode: "prototype", safety, timeoutMs: 20 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.audit?.category).toBe("timeout");
    expect(clientGeneratePayload(result).message).toBe(KID_SAFETY_MESSAGE);
  });

  it("runs the sample stub without a network call", async () => {
    let fetches = 0;
    const fetchImpl = (() => {
      fetches += 1;
      throw new Error("network");
    }) as typeof fetch;
    const result = await handleCreateGenerate(input, context, { mode: "prototype", fetchImpl });
    expect(fetches).toBe(0);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.promptVersion).toBe(CREATE_SYSTEM_PROMPT_VERSION);
    expect(result.promptBuilt.startsWith(CREATE_SYSTEM_PROMPT_VERSION)).toBe(true);
    expect(JSON.stringify(clientGeneratePayload(result))).not.toContain(CREATE_SYSTEM_PROMPT.slice(0, 24));
  });
});

describe("create rate limits", () => {
  it("stops at the project, parent, ip, and moderation ceilings", async () => {
    const capped = await handleCreateGenerate(
      input,
      { ...context, generationsThisProject: MAX_GENERATIONS_PER_PROJECT },
      { mode: "prototype" },
    );
    expect(capped).toMatchObject({ ok: false, error: "project-cap" });

    const paused = await handleCreateGenerate(
      input,
      { ...context, moderationBlocksToday: MAX_MODERATION_BLOCKS_PER_DAY },
      { mode: "prototype" },
    );
    expect(paused).toMatchObject({ ok: false, error: "moderation-pause", message: CREATE_PAUSE_MESSAGE });

    const parent = await handleCreateGenerate(
      input,
      { ...context, parentProjectsToday: MAX_PARENT_PROJECTS_PER_DAY, startingProject: true },
      { mode: "prototype" },
    );
    expect(parent).toMatchObject({ ok: false, error: "parent-ceiling" });

    const ip = await handleCreateGenerate(
      input,
      { ...context, ipGenerationsToday: MAX_IP_GENERATIONS_PER_DAY },
      { mode: "prototype" },
    );
    expect(ip).toMatchObject({ ok: false, error: "ip-ceiling" });
  });
});

describe("create age gate", () => {
  it("hides Create until the parent account allows it", () => {
    expect(createAccessDecision({ enabled: false, grade: 3 })).toBe("not-found");
    expect(createAccessDecision({ enabled: true, grade: 2 })).toBe("not-found");
    expect(createAccessDecision({ enabled: true, grade: 4 })).toBe("allow");
    expect(parentHolderDecision({ hasStudentCookie: true, hasParentUser: true })).toBe("refuse");
    expect(parentHolderDecision({ hasStudentCookie: false, hasParentUser: true })).toBe("allow");
  });

  it("shows the parent disclosure beside the toggle", () => {
    expect(parentCopy.disclosure).toContain("Filters catch most problems but not all");
  });
});

describe("ip hash", () => {
  it("does not keep the raw address", () => {
    const ip = "203.0.113.10";
    const hashed = hashIp(ip, "salt");
    expect(hashed).toBe(hashIp(ip, "salt"));
    expect(hashed).not.toContain(ip);
    expect(hashIp(ip, "other")).not.toBe(hashed);
  });
});
