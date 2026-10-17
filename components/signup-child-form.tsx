"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { addSignupChild, type ChildState } from "@/lib/children/actions";
import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";

const initial: ChildState = {};
const grades: SupportedGrade[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function SignupChildForm() {
  const [grade, setGrade] = useState<SupportedGrade>(1);
  const [state, action, pending] = useActionState(addSignupChild, initial);

  function moveGrade(event: KeyboardEvent<HTMLDivElement>) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const next = ((grade - 1 + (forward ? 1 : -1) + grades.length) % grades.length) + 1;
    if (!isSupportedGrade(next)) return;
    setGrade(next);
    document.getElementById(`signup-grade-${next}`)?.focus();
  }

  return (
    <form action={action} className="grid gap-4">
      <div>
        <p className="step-kicker">Step 2 of 2</p>
        <h1 className="display text-4xl">Add your child</h1>
      </div>
      <label className="field" htmlFor="child-first-name">
        Child's first name
        <input
          id="child-first-name"
          name="firstName"
          autoComplete="off"
          autoCapitalize="words"
          maxLength={30}
          required
        />
      </label>
      <div
        className="pill-row grade-picks"
        role="radiogroup"
        aria-label="Grade"
        onKeyDown={moveGrade}
      >
        {grades.map((item) => (
          <button
            key={item}
            id={`signup-grade-${item}`}
            type="button"
            role="radio"
            aria-checked={grade === item}
            aria-label={`Grade ${item}`}
            tabIndex={grade === item ? 0 : -1}
            onClick={() => setGrade(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <input type="hidden" name="grade" value={grade} />
      <p className="hint">You can change the grade any time.</p>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add child"}
      </button>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
