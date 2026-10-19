"use client";

import { useActionState, useState, type KeyboardEvent } from "react";
import { addSignupChild, type ChildState } from "@/lib/children/actions";
import { isSupportedGrade, type SupportedGrade } from "@/lib/grades";
import { GRADE_PROMPT_HELP, gradePromptTitle } from "@/lib/practice/placement";
import { CHILD_FIRST_NAME_MAX, childNameFieldMessage } from "@/lib/validation";

const initial: ChildState = {};
const grades: SupportedGrade[] = [1, 2, 3, 4, 5, 6, 7, 8];

export function SignupChildForm() {
  const [grade, setGrade] = useState<SupportedGrade>(1);
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState(addSignupChild, initial);
  const nameError = childNameFieldMessage(state.error);
  const formError = nameError ? undefined : state.error;

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
        <h1 className="display text-4xl">{gradePromptTitle(name.trim() || "your child")}</h1>
        <p id="grade-prompt-help" className="hint mt-2">
          {GRADE_PROMPT_HELP}
        </p>
      </div>
      <div className="field">
        <label htmlFor="child-first-name">Child&apos;s first name</label>
        <input
          id="child-first-name"
          name="firstName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          autoCapitalize="words"
          maxLength={CHILD_FIRST_NAME_MAX}
          required
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "child-first-name-error" : "grade-prompt-help"}
        />
        {nameError ? (
          <p id="child-first-name-error" className="field-error">
            {nameError}
          </p>
        ) : null}
      </div>
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
            <span className="grade-pick-num">{item}</span>
            {grade === item ? (
              <span className="grade-pick-check" aria-hidden="true">
                ✓
              </span>
            ) : null}
          </button>
        ))}
      </div>
      <input type="hidden" name="grade" value={grade} />
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Start"}
      </button>
      {formError ? (
        <p className="feedback bad" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
