"use client";

import { useActionState, useEffect, useState } from "react";
import { SpeakLine } from "@/components/speak-line";
import { finishPlacement, type PlacementState } from "@/lib/practice/placement-actions";
import {
  beginPlacement,
  markPlacementAnswer,
  stepPlacement,
  PLACEMENT_BEGIN,
  PLACEMENT_GOT_IT,
  PLACEMENT_INTRO_HELP,
  PLACEMENT_INTRO_TITLE,
  PLACEMENT_READY,
  PLACEMENT_RESULT,
  PLACEMENT_UNSURE_LABEL,
  UNSURE,
  type CheckMark,
} from "@/lib/practice/placement";
import type { SupportedGrade } from "@/lib/grades";

const initial: PlacementState = {};
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function PlacementCheck({ childId, grade }: { childId: string; grade: SupportedGrade }) {
  const began = beginPlacement(grade);
  const [phase, setPhase] = useState<"intro" | "ask" | "ack" | "done">(began.kind === "skip" ? "done" : "intro");
  const [marks, setMarks] = useState<CheckMark[]>([]);
  const [draft, setDraft] = useState("");
  const [needAnswer, setNeedAnswer] = useState(false);
  const [state, action, pending] = useActionState(finishPlacement, initial);
  const step = stepPlacement(grade, marks);
  const item = step.done ? null : step.item;
  const numeric = item ? !item.choices && /^\d+$/.test(item.answer) : false;

  useEffect(() => {
    if (phase !== "ack") return;
    const timer = window.setTimeout(() => {
      setPhase(stepPlacement(grade, marks).done ? "done" : "ask");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [phase, grade, marks]);

  function give(given: string) {
    if (!item || phase !== "ask") return;
    if (given !== UNSURE && !given.trim()) {
      setNeedAnswer(true);
      return;
    }
    setNeedAnswer(false);
    setDraft("");
    setMarks((current) => [...current, markPlacementAnswer(item, given)]);
    setPhase("ack");
  }

  if (phase === "intro") {
    return (
      <section className="placement-screen" aria-label="Quick check">
        <SpeakLine as="h1" className="display text-4xl" text={PLACEMENT_INTRO_TITLE} />
        <SpeakLine className="hint" text={PLACEMENT_INTRO_HELP} />
        <button className="btn btn-primary" type="button" onClick={() => setPhase("ask")}>
          {PLACEMENT_READY}
        </button>
      </section>
    );
  }

  if (phase === "ack") {
    return (
      <section className="placement-screen" aria-label="Quick check">
        <div role="status" aria-live="polite">
          <SpeakLine as="h1" className="display text-4xl" text={PLACEMENT_GOT_IT} />
        </div>
      </section>
    );
  }

  if (phase === "done" || step.done) {
    const line = began.kind === "skip" ? began.line : PLACEMENT_RESULT;
    return (
      <section className="placement-screen" aria-label="Quick check">
        <form action={action} className="grid gap-4">
          <input type="hidden" name="childId" value={childId} />
          <input type="hidden" name="marks" value={marks.join(",")} />
          <SpeakLine as="h1" className="display text-4xl" text={line} />
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "One moment…" : PLACEMENT_BEGIN}
          </button>
        </form>
        {state.error ? (
          <p className="feedback bad" role="alert">
            {state.error}
          </p>
        ) : null}
      </section>
    );
  }

  if (!item) return null;

  return (
    <section className="placement-screen" aria-label="Quick check">
      <SpeakLine as="h1" className={item.prompt.length > 60 ? "prompt prompt-long" : "prompt"} text={item.prompt} />
      {item.responseHint ? <SpeakLine className="hint" text={item.responseHint} /> : null}
      {item.choices ? (
        <div className="picture-choices">
          {item.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="picture-choice"
              aria-label={choice.label}
              onClick={() => give(choice.id)}
            >
              <FractionPicture parts={choice.parts} shaded={choice.shaded} />
            </button>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {numeric ? (
            <>
              <p className="answer-draft" aria-live="polite">
                {draft || " "}
              </p>
              <div className="number-pad" role="group" aria-label="Number keypad">
                {DIGITS.map((digit) => (
                  <button key={digit} type="button" onClick={() => setDraft((current) => `${current}${digit}`)}>
                    {digit}
                  </button>
                ))}
                <span aria-hidden="true" />
                <button type="button" onClick={() => setDraft((current) => `${current}0`)}>
                  0
                </button>
                <button type="button" aria-label="Delete" onClick={() => setDraft((current) => current.slice(0, -1))}>
                  Delete
                </button>
              </div>
            </>
          ) : (
            <input
              className="placement-input"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              autoComplete="off"
              aria-label="Answer"
            />
          )}
          <button className="btn btn-primary" type="button" onClick={() => give(draft)}>
            OK
          </button>
        </div>
      )}
      <button className="btn btn-secondary" type="button" onClick={() => give(UNSURE)}>
        {PLACEMENT_UNSURE_LABEL}
      </button>
      {needAnswer ? (
        <SpeakLine className="hint" text="Type an answer, or tap I'm not sure yet." />
      ) : null}
    </section>
  );
}

function FractionPicture({ parts, shaded }: { parts: number; shaded: number }) {
  return (
    <span className="fraction-pic" aria-hidden="true">
      {Array.from({ length: parts }, (_, index) => (
        <span key={index} className={index < shaded ? "fraction-part shaded" : "fraction-part"} />
      ))}
    </span>
  );
}
