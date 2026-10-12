"use client";

import { useActionState } from "react";
import { GRADES } from "@/lib/grades";
import { addChild, type ChildState } from "@/lib/children/actions";

const initial: ChildState = {};

export function AddChildForm() {
  const [state, action, pending] = useActionState(addChild, initial);

  return (
    <form action={action} className="card grid gap-3">
      <div>
        <h2 className="text-lg font-semibold">Add a child</h2>
        <p className="hint mt-1 text-sm">First name only. You can add up to two.</p>
      </div>
      <label className="field">
        First name
        <input name="firstName" autoComplete="off" required maxLength={40} />
      </label>
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
