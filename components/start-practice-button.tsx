"use client";

import { useActionState } from "react";
import { startPracticeOnDevice, type TabletState } from "@/lib/children/actions";

const initial: TabletState = {};

export function StartPracticeButton({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState(startPracticeOnDevice, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="childId" value={childId} />
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
        {pending ? "Please wait…" : "Start practice"}
      </button>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
