import { prefilterWriteMyOwn, stubSafety } from "@/lib/create/moderate";
import { chipsAllowed, fillTemplate, PROMPT_TEMPLATES } from "@/lib/create/prompts";
import {
  characterCards,
  pageArt,
  settingCards,
  SPARK_BANK,
  sparkSet,
  type SampleAsset,
} from "@/lib/create/samples";
import { spendGuard } from "@/lib/create/spend-guard";
import {
  COLOURS,
  DEFAULT_CHIPS,
  FIXES,
  HARD_GENERATIONS_PER_PROJECT,
  MOODS,
  SIZES,
  SPECIALS,
  type ChipBag,
  type FixChip,
  type ProjectType,
} from "@/lib/create/types";

export type GenerateKind = "spark" | "character" | "setting" | "page";

export type GenerateInput = {
  childId: string;
  projectType: ProjectType;
  kind: GenerateKind;
  chips: string[];
  pageIndex?: number;
  refresh?: number;
  writeMyOwn?: string;
  optIn: boolean;
  consent: boolean;
  projectsToday: number;
  dailyLimit: number;
  generationsThisProject: number;
};

export type GenerateDeps = {
  mode?: "prototype" | "live";
  fetchImpl?: typeof fetch;
  readKey?: () => string | undefined;
  spentUsd?: number;
  capUsd?: number;
};

export type GenerateSuccess = {
  ok: true;
  status: 200;
  mode: "prototype";
  source: "sample";
  assets: SampleAsset[];
  promptBuilt: string;
  notice?: "sample-only";
};

export type GenerateFailure = {
  ok: false;
  status: 400 | 403 | 422 | 429 | 501;
  error: "opt-in-off" | "consent" | "daily-limit" | "project-cap" | "moderation" | "chip" | "safety" | "spend-cap" | "live-not-enabled";
};

export type GenerateResult = GenerateSuccess | GenerateFailure;

function modeOf(deps: GenerateDeps): "prototype" | "live" {
  if (deps.mode) return deps.mode;
  return process.env.CREATE_MODE === "live" ? "live" : "prototype";
}

function chipBag(chips: string[]): ChipBag {
  const bag: ChipBag = { ...DEFAULT_CHIPS };
  for (const chip of chips) {
    if ((SIZES as readonly string[]).includes(chip)) bag.size = chip as ChipBag["size"];
    if ((COLOURS as readonly string[]).includes(chip)) bag.colour = chip as ChipBag["colour"];
    if ((MOODS as readonly string[]).includes(chip)) bag.mood = chip as ChipBag["mood"];
    if ((SPECIALS as readonly string[]).includes(chip)) bag.special = chip as ChipBag["special"];
  }
  return bag;
}

function fixesOf(chips: string[]): FixChip[] {
  return chips.filter((chip): chip is FixChip => (FIXES as readonly string[]).includes(chip));
}

function promptFor(input: GenerateInput): string {
  const fixes = fixesOf(input.chips);
  const bag = chipBag(input.chips);
  if (input.kind === "spark") {
    const subject = input.chips.find((chip) => (SPARK_BANK as readonly string[]).includes(chip)) ?? "river";
    return fillTemplate(PROMPT_TEMPLATES.spark, { subject });
  }
  if (input.kind === "character") {
    return fillTemplate(PROMPT_TEMPLATES.character, {
      name: "Pip",
      size: bag.size,
      colour: bag.colour,
      mood: bag.mood,
      special: bag.special,
      time: fixes.includes("night") ? "night" : "day",
      extra: fixes.includes("friend") ? "friend" : "day",
    });
  }
  if (input.kind === "setting") {
    return fillTemplate(PROMPT_TEMPLATES.setting, {
      place: "meadow",
      time: fixes.includes("night") ? "night" : "day",
      extra: fixes.includes("friend") ? "friend" : "day",
    });
  }
  return fillTemplate(PROMPT_TEMPLATES.page, {
    page: String(Math.min(4, Math.max(1, input.pageIndex ?? 1))),
    project: input.projectType,
    place: "meadow",
    time: fixes.includes("night") ? "night" : "day",
    extra: fixes.includes("friend") ? "friend" : "day",
  });
}

function assetsFor(input: GenerateInput): SampleAsset[] {
  const bag = chipBag(input.chips);
  const fixes = fixesOf(input.chips);
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

/**
 * Server decide function for POST /api/create/generate.
 * CREATE_MODE=prototype is the default. That path returns sample files and
 * does not call fetch or read an API key.
 */
export async function handleCreateGenerate(
  input: GenerateInput,
  deps: GenerateDeps = {},
): Promise<GenerateResult> {
  const mode = modeOf(deps);
  if (!input.optIn) return { ok: false, status: 403, error: "opt-in-off" };
  if (input.projectsToday >= input.dailyLimit) return { ok: false, status: 429, error: "daily-limit" };
  if (input.generationsThisProject >= HARD_GENERATIONS_PER_PROJECT) {
    return { ok: false, status: 429, error: "project-cap" };
  }
  if (!chipsAllowed(input.chips)) return { ok: false, status: 400, error: "chip" };
  if (input.writeMyOwn != null && input.writeMyOwn !== "") {
    const filtered = prefilterWriteMyOwn(input.writeMyOwn);
    if (!filtered.ok) return { ok: false, status: 400, error: "moderation" };
  }

  if (mode === "prototype") {
    const assets = assetsFor(input);
    const safety = stubSafety.checkOutput(assets[0]?.id ?? "");
    if (!safety.ok) return { ok: false, status: 422, error: "safety" };
    let promptBuilt = "";
    try {
      promptBuilt = promptFor(input);
    } catch {
      return { ok: false, status: 400, error: "chip" };
    }
    if (input.writeMyOwn && promptBuilt.includes(input.writeMyOwn.trim())) {
      return { ok: false, status: 400, error: "chip" };
    }
    return {
      ok: true,
      status: 200,
      mode: "prototype",
      source: "sample",
      assets,
      promptBuilt,
      notice: input.consent ? undefined : "sample-only",
    };
  }

  if (!input.consent) return { ok: false, status: 403, error: "consent" };
  const spend = await spendGuard({
    mode: "live",
    spentUsd: deps.spentUsd,
    capUsd: deps.capUsd,
    fetchImpl: deps.fetchImpl,
  });
  if (!spend.allowed) return { ok: false, status: 429, error: "spend-cap" };
  return { ok: false, status: 501, error: "live-not-enabled" };
}
