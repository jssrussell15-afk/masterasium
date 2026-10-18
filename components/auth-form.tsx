"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { PasswordField } from "@/components/password-field";
import { signIn, signUp, type AuthState } from "@/lib/auth/actions";
import {
  authSummary,
  fieldDescribedBy,
  firstAuthField,
  isAuthField,
  messageForValidity,
  placeAuthError,
  type FieldErrors,
} from "@/lib/auth/field-errors";

const initial: AuthState = {};
const FIELD_ORDER = ["email", "password"] as const;

export function AuthForm({ mode, before }: { mode: "sign-in" | "sign-up"; before?: ReactNode }) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [useClient, setUseClient] = useState(false);
  const [clientTick, setClientTick] = useState(0);
  const pendingRef = useRef(false);
  const passwordId = mode === "sign-up" ? "signup-password" : "auth-password";

  const server = !useClient && state.error ? placeAuthError(state.error) : null;
  const fields = useClient ? clientErrors : (server?.fields ?? {});
  const summary = useClient ? clientSummary(clientErrors) : (server?.summary ?? null);
  const emailError = fields.email;
  const passwordError = fields.password;

  useEffect(() => {
    const finished = pendingRef.current && !pending;
    pendingRef.current = pending;
    if (useClient) {
      if (clientTick === 0) return;
      const field = firstAuthField(clientErrors, FIELD_ORDER);
      if (field === "email") document.getElementById("auth-email")?.focus();
      if (field === "password") document.getElementById(passwordId)?.focus();
      return;
    }
    if (!finished || !state.error) return;
    const placed = placeAuthError(state.error);
    const field = firstAuthField(placed.fields, FIELD_ORDER);
    if (field === "email") document.getElementById("auth-email")?.focus();
    else if (field === "password") document.getElementById(passwordId)?.focus();
    else document.getElementById("auth-error-summary")?.focus();
  }, [pending, useClient, clientTick, state.error, clientErrors, passwordId]);

  function onSubmitClick(event: MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const next = errorsFromForm(form);
    if (Object.keys(next).length === 0) {
      setClientErrors({});
      setUseClient(false);
      return;
    }
    setClientErrors(next);
    setUseClient(true);
    setClientTick((tick) => tick + 1);
  }

  function onInvalid(event: FormEvent<HTMLInputElement>) {
    event.preventDefault();
  }

  return (
    <>
      {summary ? (
        <p id="auth-error-summary" className="feedback bad" role="alert" tabIndex={-1}>
          {summary}
        </p>
      ) : null}
      {before}
      <form action={formAction} className="grid gap-3">
        <div className="field">
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={emailError ? true : undefined}
            aria-describedby={fieldDescribedBy("auth-email-error", emailError)}
            onInvalid={onInvalid}
          />
          <FieldError id="auth-email-error" message={emailError} />
        </div>
        <PasswordField
          id={passwordId}
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          errorId={mode === "sign-up" ? "signup-password-error" : "auth-password-error"}
          error={passwordError}
          hintId={mode === "sign-up" ? "signup-password-hint" : undefined}
          hint={mode === "sign-up" ? "At least 8 characters" : undefined}
          onInvalid={onInvalid}
        />
        <button className="btn btn-primary" type="submit" disabled={pending} onClick={onSubmitClick}>
          {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create free account"}
        </button>
        {state.message ? (
          <p className="feedback good" role="status">
            {state.message}
          </p>
        ) : null}
      </form>
    </>
  );
}

function clientSummary(fields: FieldErrors): string | null {
  if (Object.keys(fields).length === 0) return null;
  return authSummary(fields, "");
}

function errorsFromForm(form: HTMLFormElement): FieldErrors {
  const next: FieldErrors = {};
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement) || !isAuthField(element.name)) continue;
    const message = messageForValidity(element.name, element.validity);
    if (message) next[element.name] = message;
  }
  return next;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}
