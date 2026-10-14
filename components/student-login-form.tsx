"use client";

import { useActionState } from "react";
import { signInStudent, type AuthState } from "@/lib/auth/actions";

const initial: AuthState = {};

export function StudentLoginForm() {
  const [state, formAction, pending] = useActionState(signInStudent, initial);

  return (
    <form action={formAction} className="grid gap-3">
      <label className="field">
        Username
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={20}
        />
      </label>
      <label className="field">
        PIN
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          minLength={4}
          maxLength={6}
          required
        />
      </label>
      <button className="btn btn-primary" type="submit" disabled={pending}>
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
