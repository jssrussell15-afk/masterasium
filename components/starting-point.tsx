"use client";

import { useActionState, useState } from "react";
import { setStartingPoint, type PlacementState } from "@/lib/practice/placement-actions";
import { parentAdjustLine, strandChoices } from "@/lib/practice/placement";
import type { SupportedGrade } from "@/lib/grades";

const initial: PlacementState = {};

export function StartingPoint({
  childId,
  firstName,
  grade,
  adjusted = false,
  startOpen = false,
}: {
  childId: string;
  firstName: string;
  grade: SupportedGrade;
  adjusted?: boolean;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [picking, setPicking] = useState(false);
  const [state, action, pending] = useActionState(setStartingPoint, initial);
  const strands = strandChoices(grade);

  return (
    <section className="starting-point" aria-label="Change starting point">
      {adjusted ? (
        <p className="status" role="status">
          {parentAdjustLine(firstName)}
        </p>
      ) : null}
      <button
        className="btn btn-secondary"
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          setPicking(false);
        }}
      >
        Change starting point
      </button>
      {open && !picking ? (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="childId" value={childId} />
          <input type="hidden" name="mode" value="grade" />
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : `Start at ${firstName}'s grade`}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={pending}
            onClick={() => setPicking(true)}
          >
            Pick a topic to start with
          </button>
        </form>
      ) : null}
      {open && picking ? (
        <div className="grid gap-3">
          <p className="hint">Pick a topic to start with</p>
          {strands.map((strand) => (
            <form key={strand.id} action={action}>
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="mode" value="strand" />
              <input type="hidden" name="strand" value={strand.id} />
              <button className="picture-choice" type="submit" disabled={pending}>
                <span>{strand.label}</span>
                <span className="hint">{strand.topic}</span>
              </button>
            </form>
          ))}
          <button className="btn btn-quiet" type="button" onClick={() => setPicking(false)}>
            Back
          </button>
        </div>
      ) : null}
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </section>
  );
}
