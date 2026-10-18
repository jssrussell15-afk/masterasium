import { TRACE_RETENTION_MONTHS, type Strategy } from "@/lib/strategy/types";

export type StrategyRow = {
  childId: string;
  skillId: string;
  strategy: Strategy;
  at: string;
};

export type StrategyRollup = {
  skillId: string;
  strategy: Strategy;
  count: number;
};

/** Counts with the child id removed. This is the shape kept after the raw trace is cleared. */
export function rollupStrategies(rows: readonly StrategyRow[]): StrategyRollup[] {
  const counts = new Map<string, StrategyRollup>();
  for (const row of rows) {
    if (row.strategy === "unknown") continue;
    const key = `${row.skillId}:${row.strategy}`;
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { skillId: row.skillId, strategy: row.strategy, count: 1 });
  }
  return [...counts.values()];
}

export function traceIsDueForRollup(createdAt: Date, now: Date): boolean {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - TRACE_RETENTION_MONTHS);
  return createdAt.getTime() < cutoff.getTime();
}
