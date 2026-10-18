"use client";

import { useActionState } from "react";
import { decideGradeRequest, setNextGradeUnlock, type ChildState } from "@/lib/children/actions";
import { nextEnrolledGrade } from "@/lib/practice/grade-access";
import { isSupportedGrade } from "@/lib/grades";

const initial: ChildState = {};

export function GradeSettings({
  childId,
  firstName,
  enrolled,
  workingGrade,
  nextUnlocked,
  requestedGrade,
}: {
  childId: string;
  firstName: string;
  enrolled: number;
  workingGrade: number;
  nextUnlocked: boolean;
  requestedGrade: number | null;
}) {
  const [unlockState, unlockAction, unlockPending] = useActionState(setNextGradeUnlock, initial);
  const [requestState, requestAction, requestPending] = useActionState(decideGradeRequest, initial);
  const next = isSupportedGrade(enrolled) ? nextEnrolledGrade(enrolled) : null;

  return (
    <div className="grid gap-3">
      <div>
        <h3 className="font-semibold">Grade</h3>
        <p className="hint mt-1">
          Enrolled in Grade {enrolled}. Working in Grade {workingGrade}. Questions and review follow
          the working grade. Every grade stays visible in the skill selector.
        </p>
      </div>
      {next ? (
        <form action={unlockAction} className="grid gap-2">
          <input type="hidden" name="childId" value={childId} />
          <input type="hidden" name="unlocked" value={nextUnlocked ? "0" : "1"} />
          <p className="hint">
            {nextUnlocked
              ? `Grade ${next} is unlocked. Choosing a topic there moves practice early.`
              : `Unlock Grade ${next} early, before this grade is finished.`}
          </p>
          <button className="btn btn-secondary w-fit" type="submit" disabled={unlockPending}>
            {unlockPending ? "Saving…" : nextUnlocked ? `Lock Grade ${next}` : `Unlock Grade ${next}`}
          </button>
          {unlockState.error ? (
            <p className="feedback bad" role="alert">
              {unlockState.error}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="hint">Grade 8 is the last grade.</p>
      )}
      {requestedGrade ? (
        <form action={requestAction} className="grid gap-2">
          <input type="hidden" name="childId" value={childId} />
          <p className="hint">
            {firstName} asked to work in Grade {requestedGrade}.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" name="approve" value="1" type="submit" disabled={requestPending}>
              Approve
            </button>
            <button className="btn btn-secondary" name="approve" value="0" type="submit" disabled={requestPending}>
              Not now
            </button>
          </div>
          {requestState.error ? (
            <p className="feedback bad" role="alert">
              {requestState.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
