import { addDays } from "@/lib/practice/dates";

export type StreakMilestone = 3 | 7 | 14;

export type SessionStreak = {
  days: number;
  includesToday: boolean;
  milestone: StreakMilestone | null;
};

/**
 * One Toronto calendar day with any attempt is one session.
 * A streak runs through today, or through yesterday when today has not started.
 * A missed day ends it. Milestones are the day the count lands on 3, 7, or 14.
 */
export function sessionStreak(dates: string[], today: string): SessionStreak {
  const unique = new Set(dates);
  const includesToday = unique.has(today);
  let cursor = includesToday ? today : addDays(today, -1);
  if (!unique.has(cursor)) {
    return { days: 0, includesToday, milestone: null };
  }

  let days = 0;
  while (unique.has(cursor)) {
    days += 1;
    cursor = addDays(cursor, -1);
  }

  const milestone =
    includesToday && (days === 3 || days === 7 || days === 14) ? (days as StreakMilestone) : null;
  return { days, includesToday, milestone };
}
