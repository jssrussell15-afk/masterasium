"use client";

import { useActionState } from "react";
import { joinNotifyList, type NotifyState } from "@/lib/notify/actions";

const initial: NotifyState = {};

export function NotifyForm() {
  const [state, action, pending] = useActionState(joinNotifyList, initial);

  return (
    <form action={action} className="mt-4 grid gap-3">
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </label>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Notify me"}
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
      <p className="hint text-sm">No account needed. We only use this to say when new skills are added.</p>
    </form>
  );
}
