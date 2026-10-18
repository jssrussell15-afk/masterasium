"use client";

import { useActionState, useState, type FormEvent } from "react";
import { setMoveAhead, type ChildState } from "@/lib/children/actions";
import { MOVE_AHEAD_LABEL, MOVE_AHEAD_NOTE } from "@/lib/practice/move-ahead";

const initial: ChildState = {};

export function MoveAheadSetting({
  childId,
  enabled,
  preview = false,
}: {
  childId: string;
  enabled: boolean;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(setMoveAhead, initial);
  const [previewOn, setPreviewOn] = useState(enabled);
  const on = preview ? previewOn : enabled;

  function onChange(event: FormEvent<HTMLFormElement>) {
    if (preview) {
      const box = event.currentTarget.elements.namedItem("enabled");
      if (box instanceof HTMLInputElement) setPreviewOn(box.checked);
      return;
    }
    event.currentTarget.requestSubmit();
  }

  return (
    <form
      action={preview ? undefined : action}
      className="move-ahead-form grid gap-2"
      data-move-ahead={on ? "on" : "off"}
      onChange={onChange}
    >
      <input type="hidden" name="childId" value={childId} />
      <label className="move-ahead">
        <input type="checkbox" name="enabled" value="1" defaultChecked={enabled} disabled={!preview && pending} />
        <span>{MOVE_AHEAD_LABEL}</span>
      </label>
      <p className="hint">{MOVE_AHEAD_NOTE}</p>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
