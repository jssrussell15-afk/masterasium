"use client";

import type { ReactNode } from "react";

export const HINT_RUNGS = [
  { id: "hint", label: "Give me a hint" },
  { id: "example", label: "Show me an example" },
] as const;

export type HintRung = (typeof HINT_RUNGS)[number]["id"];

export function HintBubbles({
  message,
  pending,
  onRung,
  giveUp,
}: {
  message: string | null;
  pending: boolean;
  onRung: (rung: HintRung) => void;
  giveUp: ReactNode;
}) {
  return (
    <div className="hint-dock">
      {message ? (
        <p className="hint-bubble" role="status">
          {message}
        </p>
      ) : null}
      <div className="hint-actions">
        {HINT_RUNGS.map((rung) => (
          <button
            key={rung.id}
            type="button"
            className="hint-target"
            disabled={pending}
            onClick={() => onRung(rung.id)}
          >
            {rung.label}
          </button>
        ))}
        {giveUp}
      </div>
    </div>
  );
}
