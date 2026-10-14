"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { AnswerFields } from "@/components/answer-fields";
import { AssistedPrompt } from "@/components/assisted-prompt";
import { BadgeTree } from "@/components/badge-tree";
import { LessonCheckNote } from "@/components/lesson-check-note";
import { SessionRecap } from "@/components/session-recap";
import { StreakMark } from "@/components/streak-mark";
import { SupportNote } from "@/components/support-note";
import { formatAccuracy, skillStatusLabel } from "@/lib/practice/format";
import { practiceAction } from "@/lib/practice/actions";
import type { PracticeState, PracticeView, QuestionKind, SkillProgress } from "@/lib/practice/types";

function kindLabel(kind: QuestionKind): string {
  if (kind === "review") return "Review";
  if (kind === "check") return "Show what you know";
  if (kind === "support") return "Practice";
  return "Focus";
}

const initial: PracticeState = {};

export function PracticeSession({ view }: { view: PracticeView }) {
  const [state, action, pending] = useActionState(practiceAction, initial);
  const question = state.next ?? view.question;
  const attempted = state.attempted ?? view.attempted;
  const correctCount = state.correctCount ?? view.correct;
  const skills = state.skills ?? view.skills;
  const fromAction = state.attempted != null;
  const streakDays = fromAction ? (state.streakDays ?? 0) : view.streakDays;
  const streakMilestone = fromAction ? (state.streakMilestone ?? null) : view.streakMilestone;
  const recap = fromAction ? (state.recap ?? null) : view.recap;
  const badges = fromAction ? (state.badges ?? []) : view.badges;
  const lesson = skills.find((skill) => skill.id === question.skillId);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [hasChosenTopic, setHasChosenTopic] = useState(false);
  const topicDialog = useRef<HTMLDialogElement>(null);
  const topicForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const dialog = topicDialog.current;
    if (!dialog) return;
    if (topicsOpen) {
      if (!dialog.open) dialog.showModal();
      document.getElementById(`topic-${question.skillId}`)?.focus();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [topicsOpen, question.skillId]);

  function selectTopic(skillId: string) {
    setHasChosenTopic(true);
    setTopicsOpen(false);
    if (skillId === question.skillId || pending) return;
    const form = topicForm.current;
    const input = form?.elements.namedItem("skillId");
    if (!form || !(input instanceof HTMLInputElement)) return;
    input.value = skillId;
    form.requestSubmit();
  }

  return (
    <div className="grid gap-6">
      <StreakMark
        days={streakDays}
        milestone={streakMilestone}
        childId={view.childId}
        today={view.today}
      />
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

      <BadgeTree badges={badges} />

      <form ref={topicForm} action={action} hidden>
        <input type="hidden" name="intent" value="choose" />
        <input type="hidden" name="childId" value={view.childId} />
        <input type="hidden" name="skillId" defaultValue={question.skillId} />
      </form>
      <button
        type="button"
        className="btn btn-secondary w-fit"
        aria-haspopup="dialog"
        disabled={pending}
        onClick={() => setTopicsOpen(true)}
      >
        {hasChosenTopic ? "Change topic" : "Select topic"}
      </button>
      <dialog
        ref={topicDialog}
        className="topic-dialog"
        aria-labelledby="topic-heading"
        onClose={() => setTopicsOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          if (!inside) setTopicsOpen(false);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="topic-heading" className="text-xl font-semibold">
            Choose a topic
          </h2>
          <button type="button" className="btn btn-quiet" onClick={() => setTopicsOpen(false)}>
            Close
          </button>
        </div>
        <ul className="topic-choices">
          {skills.map((skill) => {
            const current = skill.id === question.skillId;
            return (
              <li key={skill.id}>
                <button
                  id={`topic-${skill.id}`}
                  type="button"
                  className={current ? "topic-choice current" : "topic-choice"}
                  aria-current={current ? "true" : undefined}
                  disabled={pending}
                  onClick={() => selectTopic(skill.id)}
                >
                  {skill.title}
                  <span>{current ? `Selected · ${skillStatusLabel(skill.status)}` : skillStatusLabel(skill.status)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </dialog>

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
          {kindLabel(question.kind)} · {question.skillTitle}
        </p>
        <LessonCheckNote kind={question.kind} />
        <SupportNote kind={question.kind} />
        <h1 className={question.prompt.length > 60 ? "prompt prompt-long mt-3" : "prompt mt-3"}>
          {question.prompt}
        </h1>
        {question.responseHint ? <p className="hint mt-3">{question.responseHint}</p> : null}
        <AssistedPrompt assist={question.assist} />
      </div>

      <form key={question.questionId} action={action} className="grid gap-3">
        <input type="hidden" name="intent" value="answer" />
        <input type="hidden" name="childId" value={view.childId} />
        <input type="hidden" name="questionId" value={question.questionId} />
        <AnswerFields shape={question.shape} />
        <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Check"}
        </button>
      </form>
      <SessionRecap recap={recap} />
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