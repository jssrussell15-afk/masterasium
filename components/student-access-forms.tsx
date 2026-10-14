"use client";

import { useActionState } from "react";
import {
  resetStudentPin,
  setStudentLogin,
  type ChildState,
} from "@/lib/children/actions";

const initial: ChildState = {};

function PinFields() {
  return (
    <>
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
    </>
  );
}

export function SetStudentLoginForm({
  childId,
  firstName,
}: {
  childId: string;
  firstName: string;
}) {
  const [state, action, pending] = useActionState(setStudentLogin, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="childId" value={childId} />
      <p className="hint text-sm">
        {firstName} does not have a student login yet. Choose a username and a PIN. They use those
        to practice. They cannot reset the PIN.
      </p>
      <label className="field">
        Username
        <input
          name="username"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={20}
        />
      </label>
      <PinFields />
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Create student login"}
      </button>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ResetPinForm({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState(resetStudentPin, initial);

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="childId" value={childId} />
      <p className="hint text-sm">
        Choose a new PIN of 4 to 6 digits. The old PIN stops working, including on a signed-in
        device.
      </p>
      <PinFields />
      <button className="btn btn-secondary w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Reset PIN"}
      </button>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
