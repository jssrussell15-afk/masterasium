"use client";

import { useActionState } from "react";
import {
  leaveSignupToDesk,
  rememberTabletChild,
  startSignupPractice,
  type ChildState,
  type TabletState,
} from "@/lib/children/actions";

const initial: ChildState = {};

export function SignupReady({
  firstName,
  grade,
  childId,
  remembered = false,
}: {
  firstName: string;
  grade: number;
  childId: string;
  remembered?: boolean;
}) {
  const [startState, startAction, startPending] = useActionState(startSignupPractice, initial);
  const [deskState, deskAction, deskPending] = useActionState(leaveSignupToDesk, initial);
  const [tabletState, tabletAction, tabletPending] = useActionState(rememberTabletChild, {
    remembered,
  } satisfies TabletState);
  const pending = startPending || deskPending || tabletPending;
  const error = startState.error ?? deskState.error ?? tabletState.error;
  const saved = tabletState.remembered;

  return (
    <div className="signup-ready">
      <h1 className="display text-4xl">
        {firstName} is set up for Grade {grade}
      </h1>
      <p className="hint">
        {grade <= 2
          ? `Grade ${grade}. We'll start with the basics and adjust as we go.`
          : "A quick check comes first, so we know where to start. You can change the starting point on the parent desk."}
      </p>
      {saved ? (
        <p className="status" role="status">
          This tablet remembers {firstName}.
        </p>
      ) : (
        <form action={tabletAction}>
          <input type="hidden" name="childId" value={childId} />
          <button className="btn btn-secondary" type="submit" disabled={pending}>
            {tabletPending ? "Please wait…" : `Use this tablet for ${firstName}`}
          </button>
        </form>
      )}
      <form action={startAction}>
        <input type="hidden" name="childId" value={childId} />
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {startPending ? "Please wait…" : "Start practice on this device"}
        </button>
      </form>
      <form action={deskAction}>
        <button className="btn btn-secondary" type="submit" disabled={pending}>
          {deskPending ? "Please wait…" : "Go to parent desk"}
        </button>
      </form>
      {error ? (
        <p className="feedback bad" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
