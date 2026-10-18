import { CREATE_SYSTEM_PROMPT_VERSION } from "@/lib/create/prompts";
import { choiceAllowed } from "@/lib/create/schema";
import { SAFETY_CATEGORIES, type SafetyCategory } from "@/lib/create/moderate";
import {
  COLOURS,
  FIXES,
  MOODS,
  PROJECTS,
  REFLECTION_TAPS,
  SIZES,
  SPECIALS,
  stepNumber,
  type CreateDraft,
  type ProjectType,
  type ReflectionTap,
} from "@/lib/create/types";

export type { ProjectType, ReflectionTap };

/** Columns that may be stored. Anything else is dropped. */
export const SESSION_COLUMNS = [
  "child_id",
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
  "choice_ids",
  "chip_enums",
  "moderation_blocks",
  "prompt_version",
  "report_count",
] as const;

export type SessionMeta = {
  child_id: string;
  project_type: ProjectType;
  started_at: string;
  finished_at: string | null;
  steps_completed: number;
  keep_count: number;
  retry_count: number;
  fix_count: number;
  mismatch_flags: number[];
  reflection_taps: ReflectionTap[];
  used_write_my_own: boolean;
  choice_ids: string[];
  chip_enums: string[];
  moderation_blocks: number;
  prompt_version: string;
  report_count: number;
};

const CHIP_ENUMS = new Set<string>([
  ...SIZES,
  ...COLOURS,
  ...MOODS,
  ...SPECIALS,
  ...FIXES,
  "meadow",
  "harbour",
  "kitchen",
]);

export const MODERATION_EVENT_COLUMNS = ["child_id", "category", "prompt_version"] as const;

export type ModerationEvent = {
  child_id: string;
  category: SafetyCategory;
  prompt_version: string;
};

const TAP_SET = new Set<string>(REFLECTION_TAPS);

function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99) return null;
  return value;
}

/**
 * Builds a metadata row and drops every other field, including sentences,
 * prompts, and image data. Returns null when the metadata itself is invalid.
 */
export function toSessionRow(input: unknown): SessionMeta | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  const childId = source.child_id;
  const project = source.project_type;
  const started = source.started_at;
  if (typeof childId !== "string" || childId.trim() === "") return null;
  if (typeof project !== "string" || !(PROJECTS as readonly string[]).includes(project)) return null;
  if (typeof started !== "string" || started.trim() === "") return null;
  const steps = count(source.steps_completed);
  const keep = count(source.keep_count);
  const retry = count(source.retry_count);
  const fix = count(source.fix_count);
  if (steps == null || steps > 6 || keep == null || retry == null || fix == null) return null;
  const finished = source.finished_at;
  if (finished != null && typeof finished !== "string") return null;
  if (!Array.isArray(source.mismatch_flags) || !Array.isArray(source.reflection_taps)) return null;
  const mismatch: number[] = [];
  for (const flag of source.mismatch_flags) {
    if (typeof flag !== "number" || !Number.isInteger(flag) || flag < 1 || flag > 4) return null;
    if (!mismatch.includes(flag)) mismatch.push(flag);
  }
  const taps: ReflectionTap[] = [];
  for (const tap of source.reflection_taps) {
    if (typeof tap !== "string" || !TAP_SET.has(tap)) return null;
    if (!taps.includes(tap as ReflectionTap)) taps.push(tap as ReflectionTap);
  }
  if (typeof source.used_write_my_own !== "boolean") return null;
  const choiceIds = tokens(source.choice_ids, choiceAllowed);
  const chipEnums = tokens(source.chip_enums, (value) => CHIP_ENUMS.has(value));
  if (!choiceIds || !chipEnums) return null;
  const blocks = source.moderation_blocks == null ? 0 : count(source.moderation_blocks);
  const reports = source.report_count == null ? 0 : count(source.report_count);
  if (blocks == null || reports == null) return null;
  const version = source.prompt_version == null ? CREATE_SYSTEM_PROMPT_VERSION : source.prompt_version;
  if (version !== CREATE_SYSTEM_PROMPT_VERSION) return null;
  return {
    child_id: childId,
    project_type: project as ProjectType,
    started_at: started,
    finished_at: finished ?? null,
    steps_completed: steps,
    keep_count: keep,
    retry_count: retry,
    fix_count: fix,
    mismatch_flags: mismatch,
    reflection_taps: taps,
    used_write_my_own: source.used_write_my_own,
    choice_ids: choiceIds,
    chip_enums: chipEnums,
    moderation_blocks: blocks,
    prompt_version: version,
    report_count: reports,
  };
}

function tokens(value: unknown, allowed: (token: string) => boolean): string[] | null {
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  const next: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !allowed(item)) return null;
    if (!next.includes(item)) next.push(item);
  }
  return next;
}

export function toModerationEvent(input: unknown): ModerationEvent | null {
  if (!input || typeof input !== "object") return null;
  const source = input as Record<string, unknown>;
  if (typeof source.child_id !== "string" || source.child_id.trim() === "") return null;
  if (typeof source.category !== "string" || !(SAFETY_CATEGORIES as readonly string[]).includes(source.category)) {
    return null;
  }
  if (source.prompt_version !== CREATE_SYSTEM_PROMPT_VERSION) return null;
  return {
    child_id: source.child_id,
    category: source.category as SafetyCategory,
    prompt_version: source.prompt_version,
  };
}

/** Metadata taken from a device draft. Page sentences stay on the device. */
export function metaFromDraft(draft: CreateDraft, finished: boolean): SessionMeta | null {
  if (!draft.project) return null;
  const taps: ReflectionTap[] = [];
  const add = (tap: ReflectionTap | null) => {
    if (tap && !taps.includes(tap)) taps.push(tap);
  };
  add(draft.sparkTap);
  add(draft.characterWhy);
  add(draft.settingWhy);
  for (const tap of draft.finishTaps) add(tap);
  if (draft.characterChips.colour !== "blue") add("changed-colour");
  if (draft.characterChips.mood !== "calm") add("changed-mood");
  if (draft.characterChips.size !== "medium") add("changed-size");
  if (draft.characterChips.special !== "scarf") add("changed-special");
  if (draft.pages.some((page) => page.fixes.includes("night"))) add("changed-night");
  if (draft.pages.some((page) => page.fixes.includes("friend"))) add("changed-friend");
  const mismatch = draft.pages.flatMap((page, index) => (page.match === "no" ? [index + 1] : []));
  return toSessionRow({
    child_id: draft.childId,
    project_type: draft.project,
    started_at: draft.startedAt,
    finished_at: finished ? draft.updatedAt : null,
    steps_completed: finished ? 6 : stepNumber(draft.step),
    keep_count: draft.keepCount,
    retry_count: draft.retryCount,
    fix_count: draft.fixCount,
    mismatch_flags: mismatch,
    reflection_taps: taps,
    used_write_my_own: draft.pages.some((page) => Boolean(page.own?.trim())),
    choice_ids: choiceIdsFromDraft(draft),
    chip_enums: [
      draft.characterChips.size,
      draft.characterChips.colour,
      draft.characterChips.mood,
      draft.characterChips.special,
    ],
    moderation_blocks: draft.moderationBlocks,
    prompt_version: CREATE_SYSTEM_PROMPT_VERSION,
    report_count: draft.reportCount,
  });
}

function choiceIdsFromDraft(draft: CreateDraft): string[] {
  const raw = [
    draft.sparkId,
    draft.characterId,
    draft.settingId,
    ...draft.pages.map((page) => page.sentenceId),
  ];
  const ids: string[] = [];
  for (const value of raw) {
    const token = value ? choiceToken(value) : null;
    if (token && !ids.includes(token)) ids.push(token);
  }
  return ids;
}

function choiceToken(value: string): string | null {
  if (choiceAllowed(value)) return value;
  const pieces = value.replace(/^sample-/, "").split("-");
  return pieces.find((piece) => choiceAllowed(piece)) ?? null;
}

export function sessionHasCreativePayload(row: SessionMeta): boolean {
  const blob = JSON.stringify(row);
  return /"sentence"|"prompt"|"image"|svg|data:|writeMyOwn|"own":/i.test(blob);
}
