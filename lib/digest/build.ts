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
  streakDays?: number;
  /** Parent line about where practice started. No email is sent. */
  placementNote?: string | null;
  readyNote?: string | null;
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

/** First word of a skill title, lowercase, with no digits. `Fractions as equal parts` → fractions. */
export function topicFromTitle(title: string): string {
  const word = title.trim().toLowerCase().split(/\s+/)[0] ?? "";
  return word.replace(/[^a-z]/g, "");
}

/**
 * Topics kept fresh this week, in the order given.
 * A missed review has no date here, so a week of misses produces no line.
 */
export function freshTopicsForWeek(
  items: { title: string; freshOn?: string | null }[],
  weekStart: string,
  today: string,
): string[] {
  const topics: string[] = [];
  for (const item of items) {
    if (!item.freshOn || item.freshOn < weekStart || item.freshOn > today) continue;
    const topic = topicFromTitle(item.title);
    if (topic) topics.push(topic);
  }
  return topics;
}

/** One quiet parent line. Two topics at most. Null when nothing was recalled. */
export function freshKeptLine(topics: string[]): string | null {
  const unique: string[] = [];
  for (const topic of topics) {
    const clean = topic.trim().toLowerCase();
    if (!clean || unique.includes(clean)) continue;
    unique.push(clean);
    if (unique.length === 2) break;
  }
  if (unique.length === 0) return null;
  if (unique.length === 1) return `Kept ${unique[0]} fresh.`;
  return `Kept ${unique[0]} and ${unique[1]} fresh.`;
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
  streakDays?: number;
  placementNote?: string | null;
  readyNote?: string | null;
}): DigestSummary {
  return {
    ...input,
    accuracy: input.attempted === 0 ? null : input.correct / input.attempted,
  };
}

/** Daily draft. The weekly fresh line stays on the Sunday note. */
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
  if (summary.placementNote) lines.push(summary.placementNote);
  if (summary.readyNote) lines.push(summary.readyNote);
  lines.push("", "Today's summary was saved. No email was sent.");
  return lines.join("\n");
}
