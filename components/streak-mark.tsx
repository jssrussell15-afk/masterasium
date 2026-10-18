function StreakIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 4.5 V8 L10.4 9.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Quiet day count for the parent desk. Milestone celebrations stay off the screen. */
export function StreakMark({ days }: { days: number }) {
  const label = days === 1 ? "1 day in a row" : days > 1 ? `${days} days in a row` : "No streak yet";

  return (
    <p className="streak">
      <StreakIcon />
      {label}
    </p>
  );
}
