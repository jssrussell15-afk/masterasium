"use client";

import { useEffect, useState } from "react";
import type { StreakMilestone } from "@/lib/practice/streak";

function StreakIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5 V8 L10.4 9.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function StreakMark({
  days,
  milestone = null,
  childId,
  today,
}: {
  days: number;
  milestone?: StreakMilestone | null;
  childId?: string;
  today?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!milestone || !childId || !today) return;
    const key = `masterasium-milestone:${childId}:${today}:${milestone}`;
    if (window.localStorage.getItem(key)) return;
    setMessage(`That's ${milestone} days in a row.`);
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(key, "1");
      setMessage(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [childId, milestone, today]);

  const label = days === 1 ? "1 day in a row" : days > 1 ? `${days} days in a row` : "No streak yet";

  return (
    <div className="streak-row">
      <p className="streak">
        <StreakIcon />
        {label}
      </p>
      {message ? (
        <p className="streak-milestone" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
