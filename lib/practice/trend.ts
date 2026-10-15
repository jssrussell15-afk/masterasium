import { addDays } from "@/lib/practice/dates";

export type TrendWeek = {
  label: string;
  start: string;
  attempted: number;
  correct: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}`;
}

/** Four seven-day windows ending today, oldest first. */
export function weeklyAccuracy(
  attempts: { correct: boolean; date: string }[],
  today: string,
): TrendWeek[] {
  const weeks: TrendWeek[] = [];
  for (let index = 0; index < 4; index += 1) {
    const startOffset = -27 + index * 7;
    const start = addDays(today, startOffset);
    const end = addDays(today, startOffset + 6);
    const rows = attempts.filter((attempt) => attempt.date >= start && attempt.date <= end);
    weeks.push({
      label: shortDate(start),
      start,
      attempted: rows.length,
      correct: rows.filter((attempt) => attempt.correct).length,
    });
  }
  return weeks;
}
