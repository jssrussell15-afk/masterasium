"use client";

import { useActionState } from "react";
import { formatAccuracy } from "@/lib/practice/format";
import { submitAnswer } from "@/lib/practice/actions";
import type { PracticeState, PracticeView } from "@/lib/practice/types";

const initial: PracticeState = {};

export function PracticeSession({ view }: { view: PracticeView }) {
  const [state, action, pending] = useActionState(submitAnswer, initial);
  const question = state.next ?? view.question;
  const attempted = state.attempted ?? view.attempted;
  const correctCount = state.correctCount ?? view.correct;

  return (
    <div className="grid gap-6">
      <div className="stat-grid">
        <div>
          <p>Questions attempted</p>
          <strong>{attempted}</strong>
        </div>
        <div>
          <p>Accuracy</p>
          <strong>{formatAccuracy(attempted, correctCount)}</strong>
        </div>
        <div>
          <p>Current focus</p>
          <strong>{state.focusTitle ?? view.focusTitle}</strong>
        </div>
      </div>

      {state.correct != null ? (
        <p className={state.correct ? "feedback good" : "feedback bad"} role="status">
          {state.correct ? "That's right." : `The answer is ${state.expected}.`}
        </p>
      ) : null}
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}

      <div>
        <p className="eyebrow">
          {question.kind === "review" ? "Quick review" : "Focus"} · {question.skillTitle}
        </p>
        <h1 className="prompt mt-3">{question.prompt}</h1>
        {question.responseHint ? <p className="hint mt-3">{question.responseHint}</p> : null}
      </div>

      <form key={question.questionId} action={action} className="grid gap-3">
        <input type="hidden" name="childId" value={view.childId} />
        <input type="hidden" name="questionId" value={question.questionId} />
        <label className="field">
          Answer
          <input
            className="answer-input"
            name="answer"
            inputMode="decimal"
            autoComplete="off"
            required
            autoFocus
          />
        </label>
        <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Check"}
        </button>
      </form>
    </div>
  );
}
