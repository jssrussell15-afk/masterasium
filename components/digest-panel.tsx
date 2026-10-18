"use client";

import { useActionState } from "react";
import { saveDigestDraft, type DigestState } from "@/lib/digest/actions";

const initial: DigestState = {};

export function DigestPanel({ childId, savedText }: { childId: string; savedText: string | null }) {
  const [state, action, pending] = useActionState(saveDigestDraft, initial);
  const text = state.text ?? savedText;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="childId" value={childId} />
      <p className="hint">
        Nothing is emailed. This stores today&apos;s attempts, accuracy, and the skill they are working
        on, so a daily note can be switched on later.
      </p>
      <button className="btn btn-secondary w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save today's summary"}
      </button>
      {state.message ? (
        <p className="feedback good" role="status">
          {state.message}
        </p>
      ) : null}
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
      {text ? <pre className="overflow-x-auto whitespace-pre-wrap">{text}</pre> : null}
    </form>
  );
}
