import {
  PROJECTS,
  REFLECTION_TAPS,
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
  });
}

export function sessionHasCreativePayload(row: SessionMeta): boolean {
  const blob = JSON.stringify(row);
  return /prompt|sentence|image|svg|data:|writeMyOwn|"own"/i.test(blob);
}
