"use client";

import { useActionState } from "react";
import { setReadQuestionsAloud, type ChildState } from "@/lib/children/actions";
import { READ_ALOUD_HELP, READ_ALOUD_LABEL, readsAloudAutomatically } from "@/lib/children/read-aloud";

const initial: ChildState = {};

export function ReadAloudSetting({
  childId,
  grade,
  stored = null,
  saved = false,
}: {
  childId: string;
  grade: number;
  stored?: boolean | null;
  saved?: boolean;
}) {
  const [state, action, pending] = useActionState(setReadQuestionsAloud, initial);
  const on = readsAloudAutomatically(grade, stored);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="enabled" value="0" />
      <label className="read-aloud-setting">
        <input type="checkbox" name="enabled" value="1" defaultChecked={on} />
        <span>{READ_ALOUD_LABEL}</span>
      </label>
      <p className="hint">{READ_ALOUD_HELP}</p>
      <button className="btn btn-secondary w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {saved ? (
        <p className="feedback good" role="status">
          Saved.
        </p>
      ) : null}
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
