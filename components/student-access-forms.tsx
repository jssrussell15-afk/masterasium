"use client";

import { useActionState } from "react";
import { setChildPin, type ChildState } from "@/lib/children/actions";

const initial: ChildState = {};

export function SetPinForm({
  childId,
  firstName,
  hasLogin,
  returnTo,
  saved = false,
}: {
  childId: string;
  firstName: string;
  hasLogin: boolean;
  returnTo: "dashboard" | "settings";
  saved?: boolean;
}) {
  const [state, action, pending] = useActionState(setChildPin, initial);
  const pinId = `child-pin-${childId}`;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <p className="hint text-sm">
        {hasLogin
          ? `Set a new PIN for ${firstName}. The old PIN stops working. They sign in with their first name and this PIN.`
          : `${firstName} signs in with their first name and a PIN. Choose 4 to 6 digits.`}
      </p>
      <label className="field" htmlFor={pinId}>
        PIN
        <input
          id={pinId}
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4,6}"
          minLength={4}
          maxLength={6}
          required
        />
      </label>
      <button className="btn btn-secondary w-fit" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Set PIN"}
      </button>
      {saved ? (
        <p className="feedback good" role="status">
          PIN saved
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
