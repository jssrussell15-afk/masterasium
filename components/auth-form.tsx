"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/lib/auth/actions";

const initial: AuthState = {};

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid gap-3">
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
      </label>
      {mode === "sign-up" ? (
        <label className="field">
          Confirm password
          <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        </label>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create free account"}
      </button>
      {state.message ? (
        <p className="feedback good" role="status">
          {state.message}
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
