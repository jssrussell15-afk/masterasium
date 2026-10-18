"use client";

import { useActionState, useState } from "react";
import { reportContentFlag, type FlagState } from "@/lib/content/actions";
import { FLAG_REASONS, type FlagSurface } from "@/lib/content/model";

const initial: FlagState = {};

export function SomethingLooksWrong({
  enabled,
  surface,
  childId,
  skillId,
  itemId = null,
  prompt,
  preview = false,
}: {
  enabled: boolean;
  surface: FlagSurface;
  childId: string;
  skillId: string;
  itemId?: string | null;
  prompt: string;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(reportContentFlag, initial);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (!enabled) return null;
  if (sent || state.note) {
    return <p className="hint quiet-flag-sent">Sent.</p>;
  }

  if (!open) {
    return (
      <button type="button" className="quiet-flag" onClick={() => setOpen(true)}>
        Something looks wrong
      </button>
    );
  }

  return (
    <form
      action={preview ? undefined : action}
      className="quiet-flag-form grid gap-2"
      onSubmit={(event) => {
        if (!preview) return;
        event.preventDefault();
        const choice = String(new FormData(event.currentTarget).get("reason") ?? "");
        const note = String(new FormData(event.currentTarget).get("note") ?? "");
        if (choice === "Something else" && note.trim().length === 0) return;
        if (!choice) return;
        setSent(true);
      }}
    >
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="skillId" value={skillId} />
      <input type="hidden" name="itemId" value={itemId ?? ""} />
      <input type="hidden" name="prompt" value={prompt} />
      <input type="hidden" name="surface" value={surface} />
      <fieldset className="grid gap-2">
        <legend className="visually-hidden">What looks wrong</legend>
        {FLAG_REASONS.map((reason) => (
          <label key={reason} className="quiet-flag-choice">
            <input type="radio" name="reason" value={reason} />
            <span>{reason}</span>
          </label>
        ))}
        <input className="answer-input" name="note" maxLength={400} placeholder="A short note" />
      </fieldset>
      <button className="btn btn-secondary w-fit" type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send"}
      </button>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
