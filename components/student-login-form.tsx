"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { signInStudent, type AuthState } from "@/lib/auth/actions";
import {
  authSummary,
  fieldDescribedBy,
  firstAuthField,
  placeAuthError,
  type AuthField,
  type FieldErrors,
} from "@/lib/auth/field-errors";
import type { RememberedChild } from "@/lib/children/tablet";
import { isValidPin } from "@/lib/validation";

const initial: AuthState = {};
const FIELD_ORDER = ["firstName", "pin"] as const;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;
const PIN_DOTS = 6;

/** Count only. The spoken text never includes the digits themselves. */
export function pinDigitAnnouncement(count: number): string {
  const entered = Math.max(0, Math.min(count, PIN_DOTS));
  return `${entered} of ${PIN_DOTS} digits entered`;
}

export function StudentLoginForm({
  before,
  students,
}: {
  before?: ReactNode;
  students: RememberedChild[];
}) {
  const [state, formAction, pending] = useActionState(signInStudent, initial);
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [useClient, setUseClient] = useState(false);
  const [clientTick, setClientTick] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const pendingRef = useRef(false);

  const selected = students.find((student) => student.id === selectedId) ?? null;
  const server = !useClient && state.error ? placeAuthError(state.error) : null;
  const fields = useClient ? clientErrors : (server?.fields ?? {});
  const summary = useClient ? clientSummary(clientErrors) : (server?.summary ?? null);
  const nameError = fields.firstName;
  const pinError = fields.pin;
  const nameDetail = nameError && nameError !== pinError ? nameError : undefined;

  useEffect(() => {
    const finished = pendingRef.current && !pending;
    pendingRef.current = pending;
    if (useClient) {
      if (clientTick === 0) return;
      focusField(firstAuthField(clientErrors, FIELD_ORDER));
      return;
    }
    if (!finished || !state.error) return;
    setPin("");
    const placed = placeAuthError(state.error);
    const field = firstAuthField(placed.fields, FIELD_ORDER);
    if (field) focusField(field);
    else document.getElementById("auth-error-summary")?.focus();
  }, [pending, useClient, clientTick, state.error, clientErrors]);

  function choose(student: RememberedChild) {
    setSelectedId(student.id);
    setPin("");
    setClientErrors({});
    setUseClient(true);
  }

  function clearChoice() {
    setSelectedId(null);
    setPin("");
    setClientErrors({});
    setUseClient(true);
  }

  useEffect(() => {
    if (!selectedId) return;
    document.querySelector(".pin-entry")?.scrollIntoView({ block: "start" });
  }, [selectedId]);

  function addDigit(digit: string) {
    setPin((current) => (current.length >= 6 ? current : current + digit));
    setClientErrors({});
    setUseClient(true);
  }

  function deleteDigit() {
    setPin((current) => current.slice(0, -1));
    setClientErrors({});
    setUseClient(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (!selected) {
      event.preventDefault();
      return;
    }
    const message = pinProblem(pin);
    if (message) {
      event.preventDefault();
      setClientErrors({ pin: message });
      setUseClient(true);
      setClientTick((tick) => tick + 1);
      return;
    }
    setClientErrors({});
    setUseClient(false);
  }

  return (
    <>
      {summary ? (
        <p id="auth-error-summary" className="feedback bad" role="alert" tabIndex={-1}>
          {summary}
        </p>
      ) : null}
      {before}
      {students.length === 0 ? (
        <p className="hint">No student is saved on this tablet yet.</p>
      ) : (
        <form action={formAction} className="student-sign-in grid gap-3" onSubmit={onSubmit}>
          <div className="profile-picks" role="group" aria-label="Students" hidden={selected != null}>
            {students.map((student, index) => (
              <button
                key={student.id}
                id={selectedId == null && index === 0 ? "student-name" : undefined}
                type="button"
                onClick={() => choose(student)}
              >
                {student.firstName}
              </button>
            ))}
          </div>
          <FieldError id="student-name-error" message={nameDetail} />
          <input type="hidden" name="firstName" value={selected?.firstName ?? ""} />
          <input type="hidden" name="pin" value={pin} />
          <div className="pin-entry" hidden={selected == null}>
            <div className="grid gap-3">
              <div className="pin-who">
                <p
                  id={selected ? "student-name" : undefined}
                  className="pin-who-name"
                  tabIndex={-1}
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={fieldDescribedBy("student-name-error", nameDetail)}
                >
                  {selected?.firstName}
                </p>
                {students.length > 1 ? (
                  <button type="button" className="btn btn-quiet" onClick={clearChoice}>
                    Choose another name
                  </button>
                ) : null}
              </div>
              <p
                id="student-pin"
                className="pin-dots"
                tabIndex={-1}
                aria-label="PIN"
                aria-invalid={pinError ? true : undefined}
                aria-describedby={fieldDescribedBy("student-pin-error", pinError)}
              >
                {Array.from({ length: PIN_DOTS }, (_, index) => (
                  <span key={index} data-filled={index < pin.length ? "true" : "false"} aria-hidden="true" />
                ))}
              </p>
              <p className="visually-hidden" aria-live="polite" aria-atomic="true">
                {pinDigitAnnouncement(pin.length)}
              </p>
              <div className="pin-pad" role="group" aria-label="PIN">
                {DIGITS.map((digit) => (
                  <button key={digit} type="button" onClick={() => addDigit(digit)}>
                    {digit}
                  </button>
                ))}
                <span aria-hidden="true" />
                <button type="button" onClick={() => addDigit("0")}>
                  0
                </button>
                <button type="button" data-key="delete" aria-label="Delete" onClick={deleteDigit}>
                  Delete
                </button>
              </div>
              <FieldError id="student-pin-error" message={pinError} />
              <button className="btn btn-primary" type="submit" disabled={pending}>
                {pending ? "Please wait…" : "Start practice"}
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}

function pinProblem(value: string): string | null {
  if (!value) return "Enter a PIN.";
  if (!isValidPin(value)) return "Use a PIN of 4 to 6 digits.";
  return null;
}

function clientSummary(fields: FieldErrors): string | null {
  if (Object.keys(fields).length === 0) return null;
  return authSummary(fields, "");
}

function focusField(field: AuthField | null) {
  if (field === "pin") document.getElementById("student-pin")?.focus();
  else if (field === "firstName") document.getElementById("student-name")?.focus();
  else document.getElementById("auth-error-summary")?.focus();
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}
