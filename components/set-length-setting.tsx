"use client";

import { useActionState, useState, type FormEvent } from "react";
import { setPracticeLength, type ChildState } from "@/lib/children/actions";
import { SET_LENGTHS, SET_LENGTH_LABEL, SET_LENGTH_NOTE, type SetLength } from "@/lib/practice/set-length";

const initial: ChildState = {};

export function SetLengthSetting({
  childId,
  minutes,
  preview = false,
}: {
  childId: string;
  minutes: number;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(setPracticeLength, initial);
  const [previewMinutes, setPreviewMinutes] = useState<SetLength>(minutes === 10 || minutes === 20 ? minutes : 15);
  const selected = preview ? previewMinutes : minutes === 10 || minutes === 20 ? minutes : 15;

  function onChange(event: FormEvent<HTMLFormElement>) {
    if (preview) {
      const picked = new FormData(event.currentTarget).get("minutes");
      const next = Number(picked);
      if (next === 10 || next === 15 || next === 20) setPreviewMinutes(next);
      return;
    }
    event.currentTarget.requestSubmit();
  }

  return (
    <form
      action={preview ? undefined : action}
      className="set-length grid gap-2"
      data-set-length={selected}
      onChange={onChange}
    >
      <input type="hidden" name="childId" value={childId} />
      <fieldset className="grid gap-2" disabled={!preview && pending}>
        <legend className="font-semibold">{SET_LENGTH_LABEL}</legend>
        <p className="hint">{SET_LENGTH_NOTE}</p>
        <div className="set-length-options">
          {SET_LENGTHS.map((length) => (
            <label key={length} className="set-length-option">
              <input type="radio" name="minutes" value={length} defaultChecked={minutes === length} />
              <span>{length} minutes</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
