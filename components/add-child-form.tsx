"use client";

import { useActionState } from "react";
import { GRADES } from "@/lib/grades";
import { addChild, type ChildState } from "@/lib/children/actions";
import { CHILD_FIRST_NAME_MAX, childNameFieldMessage } from "@/lib/validation";

const initial: ChildState = {};

export function AddChildForm() {
  const [state, action, pending] = useActionState(addChild, initial);
  const nameError = childNameFieldMessage(state.error);
  const formError = nameError ? undefined : state.error;

  return (
    <form action={action} className="card grid gap-3">
      <div>
        <h2 className="text-lg font-semibold">Add a child</h2>
        <p className="hint mt-1 text-sm">
          First name, grade, and a PIN. You can add up to two. They sign in with their first name
          and PIN. You can change the PIN on their profile.
        </p>
      </div>
      <div className="field">
        <label htmlFor="add-child-first-name">First name</label>
        <input
          id="add-child-first-name"
          name="firstName"
          autoComplete="off"
          required
          maxLength={CHILD_FIRST_NAME_MAX}
          aria-invalid={nameError ? true : undefined}
          aria-describedby={nameError ? "add-child-first-name-error" : undefined}
        />
        {nameError ? (
          <p id="add-child-first-name-error" className="field-error">
            {nameError}
          </p>
        ) : null}
      </div>
      <label className="field">
        Grade
        <select name="grade" defaultValue="1">
          {GRADES.map((grade) => (
            <option key={grade.grade} value={grade.grade} disabled={!grade.available}>
              {grade.label}
              {grade.available ? "" : " (soon)"}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        PIN
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="[0-9]*"
          minLength={4}
          maxLength={6}
          required
        />
      </label>
      <label className="field">
        Confirm PIN
        <input
          name="confirmPin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="[0-9]*"
          minLength={4}
          maxLength={6}
          required
        />
      </label>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Add child"}
      </button>
      {formError ? (
        <p className="feedback bad" role="alert">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
