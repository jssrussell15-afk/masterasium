import type { SupportedGrade } from "@/lib/grades";

const TORONTO = "America/Toronto";

export type DigestSummary = {
  childFirstName: string;
  grade: SupportedGrade;
  date: string;
  attempted: number;
  correct: number;
  accuracy: number | null;
  focusSkillId: string;
  focusSkillTitle: string;
  recap?: string | null;
};

export function torontoDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function offsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TORONTO,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  let hour = value("hour");
  if (hour === 24) hour = 0;
  const asUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    hour,
    value("minute"),
    value("second"),
  );
  return (asUtc - date.getTime()) / 60_000;
}

export function torontoDayStart(now = new Date()): Date {
  const date = torontoDate(now);
  const utcMidnight = new Date(`${date}T00:00:00.000Z`);
  const adjusted = new Date(utcMidnight.getTime() - offsetMinutes(utcMidnight) * 60_000);
  return new Date(utcMidnight.getTime() - offsetMinutes(adjusted) * 60_000);
}

export function torontoDayRange(now = new Date()): { date: string; start: Date; end: Date } {
  const start = torontoDayStart(now);
  const end = torontoDayStart(new Date(start.getTime() + 36 * 60 * 60 * 1000));
  return { date: torontoDate(now), start, end };
}

export function buildDigestSummary(input: {
  childFirstName: string;
  grade: SupportedGrade;
  date: string;
  attempted: number;
  correct: number;
  focusSkillId: string;
  focusSkillTitle: string;
  recap?: string | null;
}): DigestSummary {
  return {
    ...input,
    accuracy: input.attempted === 0 ? null : input.correct / input.attempted,
  };
}

export function renderDigestText(summary: DigestSummary): string {
  const accuracy =
    summary.accuracy == null ? "n/a" : `${Math.round(summary.accuracy * 100)}%`;
  const lines = [
    "Masterasium daily practice",
    `${summary.childFirstName} · Grade ${summary.grade} · ${summary.date}`,
    `Questions attempted: ${summary.attempted}`,
    `Accuracy: ${accuracy}`,
    `Current focus: ${summary.focusSkillTitle}`,
  ];
  if (summary.recap) lines.push(summary.recap);
  lines.push("", "Today's summary was saved. No email was sent.");
  return lines.join("\n");
}
