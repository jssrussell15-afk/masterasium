"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { formatAccuracy, skillStatusLabel } from "@/lib/practice/format";
import { practiceAction } from "@/lib/practice/actions";
import type { PracticeState, PracticeView, SkillProgress } from "@/lib/practice/types";

const initial: PracticeState = {};

export function PracticeSession({ view }: { view: PracticeView }) {
  const [state, action, pending] = useActionState(practiceAction, initial);
  const question = state.next ?? view.question;
  const attempted = state.attempted ?? view.attempted;
  const correctCount = state.correctCount ?? view.correct;
  const skills = state.skills ?? view.skills;
  const lesson = skills.find((skill) => skill.id === question.skillId);

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
          <p>Current skill</p>
          <strong>{state.focusTitle ?? view.focusTitle}</strong>
        </div>
      </div>

      <form action={action}>
        <input type="hidden" name="intent" value="choose" />
        <input type="hidden" name="childId" value={view.childId} />
        <label className="field">
          Skill
          <select
            name="skillId"
            key={`${question.questionId}-${question.skillId}`}
            defaultValue={question.skillId}
            disabled={pending}
            onChange={(event) => {
              if (event.target.value !== question.skillId) event.currentTarget.form?.requestSubmit();
            }}
          >
            {skills.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.title} — {skillStatusLabel(skill.status)}
              </option>
            ))}
          </select>
        </label>
      </form>

      {state.correct != null ? (
        <div className={state.correct ? "feedback good" : "feedback bad"} role="status">
          {state.correct ? (
            <p>That&apos;s right.</p>
          ) : (
            <>
              <p>The answer is {state.expected}.</p>
              {state.steps && state.steps.length > 0 ? (
                <ol className="steps">
                  {state.steps.map((step, index) => (
                    <li key={`worked-${index}`}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      {state.note ? <p className="hint">{state.note}</p> : null}
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}

      {lesson ? <LessonPanel childId={view.childId} skill={lesson} /> : null}

      <div>
        <p className="eyebrow">
          {question.kind === "review" ? "Review" : "Focus"} · {question.skillTitle}
        </p>
        <h1 className={question.prompt.length > 60 ? "prompt prompt-long mt-3" : "prompt mt-3"}>
          {question.prompt}
        </h1>
        {question.responseHint ? <p className="hint mt-3">{question.responseHint}</p> : null}
      </div>

      <form key={question.questionId} action={action} className="grid gap-3">
        <input type="hidden" name="intent" value="answer" />
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

function LessonPanel({ childId, skill }: { childId: string; skill: SkillProgress }) {
  const [open, setOpen] = useState<boolean | null>(null);
  const storageKey = `masterasium-lesson:${childId}:${skill.id}`;

  useEffect(() => {
    const seen = window.localStorage.getItem(storageKey) === "1";
    setOpen(!seen);
    if (seen) return;
    const markSeen = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, "1");
    }, 300);
    return () => window.clearTimeout(markSeen);
  }, [storageKey]);

  if (open == null) return null;

  if (!open) {
    return (
      <button type="button" className="btn btn-quiet w-fit" onClick={() => setOpen(true)}>
        Show explanation
      </button>
    );
  }

  return (
    <section className="lesson">
      <p>{skill.summary}</p>
      <p className="mt-3">
        <strong>Example.</strong> {skill.examplePrompt}
      </p>
      <ol className="steps">
        {skill.exampleSteps.map((step, index) => (
          <li key={`${skill.id}-example-${index}`}>{step}</li>
        ))}
      </ol>
      <p className="mt-2">Answer: {skill.exampleAnswer}</p>
      <button
        type="button"
        className="btn btn-quiet mt-2"
        onClick={() => {
          window.localStorage.setItem(storageKey, "1");
          setOpen(false);
        }}
      >
        Hide explanation
      </button>
    </section>
  );
}