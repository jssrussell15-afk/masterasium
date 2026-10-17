export const EVENT_KINDS = [
  "intro_viewed",
  "hint_rung",
  "question_attempted",
  "time_on_task",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export type PracticeEvent = {
  kind: EventKind;
  skillId: string | null;
  detail: Record<string, string | number>;
};

const RUNG = new Set(["hint", "example", "give-up"]);
const CYCLE = new Set(["new", "relearn", "rollback"]);

function skillId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 80) return null;
  return trimmed;
}

function detailValue(key: string, value: unknown): string | number | null {
  if (key === "rung" && typeof value === "string" && RUNG.has(value)) return value;
  if (key === "cycle" && typeof value === "string" && CYCLE.has(value)) return value;
  if (key === "correct" && (value === 0 || value === 1)) return value;
  if (key === "seconds" && typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 7200) {
    return value;
  }
  return null;
}

/** Drops anything that is not a short event field. Question text never qualifies. */
export function buildPracticeEvent(input: {
  kind: string;
  skillId?: string | null;
  detail?: Record<string, unknown>;
}): PracticeEvent | null {
  if (!EVENT_KINDS.includes(input.kind as EventKind)) return null;
  const detail: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(input.detail ?? {})) {
    const kept = detailValue(key, value);
    if (kept != null) detail[key] = kept;
  }
  if (input.kind === "hint_rung" && detail.rung == null) return null;
  if (input.kind === "intro_viewed" && detail.cycle == null) return null;
  if (input.kind === "time_on_task" && detail.seconds == null) return null;
  if (input.kind === "question_attempted" && detail.correct == null) return null;
  return {
    kind: input.kind as EventKind,
    skillId: skillId(input.skillId),
    detail,
  };
}
