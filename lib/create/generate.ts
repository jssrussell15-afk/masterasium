import { screenWriteMyOwn } from "@/lib/create/blocklist";
import { CREATE_PAUSE_MESSAGE, KID_SAFETY_MESSAGE, runSafety, stubSafety, type SafetyCategory, type SafetyFilter } from "@/lib/create/moderate";
import { buildCreatePrompt, CREATE_SYSTEM_PROMPT_VERSION, PROMPT_TEMPLATES } from "@/lib/create/prompts";
import { assessRateLimit, type RateState } from "@/lib/create/rate-limit";
import {
  characterCards,
  pageArt,
  settingCards,
  sparkSet,
  type SampleAsset,
} from "@/lib/create/samples";
import type { GenerateBody } from "@/lib/create/schema";
import { spendGuard } from "@/lib/create/spend-guard";
import { DEFAULT_CHIPS, type ChipBag, type FixChip } from "@/lib/create/types";

export type GenerateInput = GenerateBody;

export type GenerateContext = RateState & {
  optIn: boolean;
  consent: boolean;
  startingProject?: boolean;
};

export type GenerateDeps = {
  mode?: "prototype" | "live";
  fetchImpl?: typeof fetch;
  readKey?: () => string | undefined;
  spentUsd?: number;
  capUsd?: number;
  safety?: SafetyFilter;
  timeoutMs?: number;
};

export type ModerationAudit = {
  category: SafetyCategory;
  promptVersion: string;
  moderationBlocksToday: number;
  generationsThisProject: number;
};

export type GenerateSuccess = {
  ok: true;
  status: 200;
  mode: "prototype";
  source: "sample";
  assets: SampleAsset[];
  promptBuilt: string;
  promptVersion: string;
  notice?: "sample-only";
};

export type GenerateFailure = {
  ok: false;
  status: 400 | 403 | 404 | 422 | 429 | 501;
  error:
    | "not-found"
    | "consent"
    | "daily-limit"
    | "project-cap"
    | "moderation-pause"
    | "parent-ceiling"
    | "ip-ceiling"
    | "body"
    | "safety"
    | "spend-cap"
    | "live-not-enabled";
  message?: string;
  audit?: ModerationAudit;
};

export type GenerateResult = GenerateSuccess | GenerateFailure;

function modeOf(deps: GenerateDeps): "prototype" | "live" {
  if (deps.mode) return deps.mode;
  return process.env.CREATE_MODE === "live" ? "live" : "prototype";
}

function chipBag(input: GenerateInput): ChipBag {
  return {
    size: input.chips.size ?? DEFAULT_CHIPS.size,
    colour: input.chips.colour ?? DEFAULT_CHIPS.colour,
    mood: input.chips.mood ?? DEFAULT_CHIPS.mood,
    special: input.chips.special ?? DEFAULT_CHIPS.special,
  };
}

function fixesOf(input: GenerateInput): FixChip[] {
  return input.chips.fix ? [input.chips.fix] : [];
}

function promptFor(input: GenerateInput): string {
  const fixes = fixesOf(input);
  const bag = chipBag(input);
  const time = fixes.includes("night") ? "night" : "day";
  const extra = fixes.includes("friend") ? "friend" : "day";
  if (input.kind === "spark") {
    return buildCreatePrompt(PROMPT_TEMPLATES.spark, {
      subject: input.chips.subject ?? "river",
    });
  }
  if (input.kind === "character") {
    return buildCreatePrompt(PROMPT_TEMPLATES.character, {
      name: "Pip",
      size: bag.size,
      colour: bag.colour,
      mood: bag.mood,
      special: bag.special,
      time,
      extra,
    });
  }
  if (input.kind === "setting") {
    return buildCreatePrompt(PROMPT_TEMPLATES.setting, {
      place: input.chips.place ?? "meadow",
      time,
      extra,
    });
  }
  return buildCreatePrompt(PROMPT_TEMPLATES.page, {
    page: String(input.pageIndex ?? 1),
    project: input.projectType,
    place: input.chips.place ?? "meadow",
    time,
    extra,
  });
}

function assetsFor(input: GenerateInput): SampleAsset[] {
  const bag = chipBag(input);
  const fixes = fixesOf(input);
  if (input.kind === "spark") return sparkSet(input.refresh ?? 0);
  if (input.kind === "character") return characterCards(input.refresh ?? 0, bag, fixes);
  if (input.kind === "setting") return settingCards(input.refresh ?? 0, fixes);
  return [
    pageArt({
      project: input.projectType,
      page: input.pageIndex ?? 1,
      retry: input.refresh ?? 0,
      fixes,
    }),
  ];
}

function blocked(category: SafetyCategory, context: GenerateContext): GenerateFailure {
  return {
    ok: false,
    status: 422,
    error: "safety",
    message: KID_SAFETY_MESSAGE,
    audit: {
      category,
      promptVersion: CREATE_SYSTEM_PROMPT_VERSION,
      moderationBlocksToday: context.moderationBlocksToday + 1,
      generationsThisProject: context.generationsThisProject + 1,
    },
  };
}

/** Fields the browser may see. Prompt text, categories, and sentences stay off this object. */
export function clientGeneratePayload(result: GenerateResult): {
  ok: boolean;
  error?: GenerateFailure["error"];
  message?: string;
  mode?: "prototype";
  source?: "sample";
  assets?: SampleAsset[];
  notice?: "sample-only" | null;
} {
  if (!result.ok) {
    return { ok: false, error: result.error, message: result.message };
  }
  return {
    ok: true,
    mode: result.mode,
    source: result.source,
    assets: result.assets,
    notice: result.notice ?? null,
  };
}

/**
 * Server decide function for POST /api/create/generate.
 * CREATE_MODE=prototype is the default. That path returns sample files,
 * runs the stub safety check, and does not call fetch or read an API key.
 */
export async function handleCreateGenerate(
  input: GenerateInput,
  context: GenerateContext,
  deps: GenerateDeps = {},
): Promise<GenerateResult> {
  const mode = modeOf(deps);
  if (!context.optIn) return { ok: false, status: 404, error: "not-found" };

  const rate = assessRateLimit(context, context.startingProject === true);
  if (!rate.ok) {
    return {
      ok: false,
      status: 429,
      error: rate.error,
      message: rate.error === "moderation-pause" ? CREATE_PAUSE_MESSAGE : undefined,
    };
  }

  if (input.writeMyOwn != null && input.writeMyOwn !== "") {
    const screened = screenWriteMyOwn(input.writeMyOwn);
    if (!screened.ok && screened.reason === "blocked") return blocked(screened.category, context);
    if (!screened.ok) return { ok: false, status: 400, error: "body", message: KID_SAFETY_MESSAGE };
  }

  if (mode === "prototype") {
    const assets = assetsFor(input);
    const safety = await runSafety(deps.safety ?? stubSafety, assets.map((asset) => asset.id), deps.timeoutMs);
    if (!safety.ok) return blocked(safety.category, context);
    let promptBuilt = "";
    try {
      promptBuilt = promptFor(input);
    } catch {
      return { ok: false, status: 400, error: "body", message: KID_SAFETY_MESSAGE };
    }
    if (input.writeMyOwn && promptBuilt.includes(input.writeMyOwn.trim())) {
      return blocked("error", context);
    }
    return {
      ok: true,
      status: 200,
      mode: "prototype",
      source: "sample",
      assets,
      promptBuilt,
      promptVersion: CREATE_SYSTEM_PROMPT_VERSION,
      notice: context.consent ? undefined : "sample-only",
    };
  }

  if (!context.consent) return { ok: false, status: 403, error: "consent" };
  const spend = await spendGuard({
    mode: "live",
    spentUsd: deps.spentUsd,
    capUsd: deps.capUsd,
    fetchImpl: deps.fetchImpl,
  });
  if (!spend.allowed) return { ok: false, status: 429, error: "spend-cap" };
  return { ok: false, status: 501, error: "live-not-enabled" };
}
