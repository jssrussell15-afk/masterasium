import { masteryLabel, masteryMark } from "@/lib/practice/mastery";
import type { SkillStatus } from "@/lib/practice/types";

export function MasteryMark({ status }: { status: SkillStatus }) {
  const mark = masteryMark(status);
  const label = masteryLabel(mark);
  return (
    <span className={`mastery-mark ${mark}`} title={label}>
      {mark === "mastered" ? (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.2 6.3 4.7 9 9.8 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ) : mark === "in-progress" ? (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="2.3" fill="currentColor" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <circle cx="6" cy="6" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
      <span className="visually-hidden">{label}</span>
    </span>
  );
}
