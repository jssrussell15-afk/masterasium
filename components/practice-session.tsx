"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { AnswerFields } from "@/components/answer-fields";
import { AssistedPrompt } from "@/components/assisted-prompt";
import { LessonCheckNote } from "@/components/lesson-check-note";
import { MasteryMark } from "@/components/mastery-mark";
import { SessionRecap } from "@/components/session-recap";
import { StreakMark } from "@/components/streak-mark";
import { SupportNote } from "@/components/support-note";
import { formatAccuracy } from "@/lib/practice/format";
import { markIntroSeen, practiceAction } from "@/lib/practice/actions";
import { gradeIsOpen, nextEnrolledGrade, selectorGrades } from "@/lib/practice/grade-access";
import { introProgress, type SkillIntro } from "@/lib/practice/intro-view";
import { masteryLabel, masteryMark } from "@/lib/practice/mastery";
import type { PracticeState, PracticeView, QuestionKind, SkillProgress } from "@/lib/practice/types";
import type { SupportedGrade } from "@/lib/grades";

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
  const requestedGrade =
    state.requestedGrade !== undefined ? state.requestedGrade : view.requestedGrade;
  const requestNote = state.requestNote;
  const lesson = skills.find((skill) => skill.id === question.skillId);
  const access = {
    ...view.access,
    working: state.workingGrade ?? view.access.working,
    requested: requestedGrade,
  };
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [hasChosenTopic, setHasChosenTopic] = useState(false);
  const intro = question.intro ?? null;
  const introToken = intro ? `${question.questionId}:${intro.skillId}:${intro.cycle}` : "";
  const [finishedIntro, setFinishedIntro] = useState("");
  const showingIntro = intro != null && finishedIntro !== introToken;
  const topicDialog = useRef<HTMLDialogElement>(null);
  const topicForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (showingIntro) setTopicsOpen(false);
  }, [showingIntro]);

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

      {requestNote ? (
        <p className="hint" role="status">
          {requestNote}
        </p>
      ) : null}

      <form ref={topicForm} action={action} hidden>
        <input type="hidden" name="intent" value="choose" />
        <input type="hidden" name="childId" value={view.childId} />
        <input type="hidden" name="skillId" defaultValue={question.skillId} />
      </form>
      <button
        type="button"
        className="btn btn-secondary w-fit"
        aria-haspopup="dialog"
        disabled={pending || showingIntro}
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
        <div className="topic-grades">
          {selectorGrades().map((grade) => {
            const group = skills.filter((skill) => skill.grade === grade);
            return (
              <section key={grade} className="topic-grade" aria-label={`Grade ${grade}`}>
                <h3>Grade {grade}</h3>
                <p className="hint">{gradeNote(grade, access, requestedGrade)}</p>
                <ul className="topic-choices">
                  {group.map((skill) => {
                    const current = skill.id === question.skillId;
                    const label = masteryLabel(masteryMark(skill.status));
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
                          <span className="topic-name">
                            <MasteryMark status={skill.status} />
                            {skill.title}
                          </span>
                          <span>{current ? `Selected · ${label}` : label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
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

      {showingIntro && intro ? (
        <TopicIntro
          key={introToken}
          intro={intro}
          childId={view.childId}
          onFinished={() => {
            window.localStorage.setItem(`masterasium-lesson:${view.childId}:${intro.skillId}`, "1");
            setFinishedIntro(introToken);
          }}
        />
      ) : (
        <>
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
            {intro ? (
              <>
                <input type="hidden" name="introSkillId" value={intro.skillId} />
                <input type="hidden" name="introCycle" value={intro.cycle} />
              </>
            ) : null}
            <AnswerFields shape={question.shape} />
            <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
              {pending ? "Checking…" : "Check"}
            </button>
          </form>
        </>
      )}
      <SessionRecap recap={recap} />
    </div>
  );
}

function TopicIntro({
  intro,
  childId,
  onFinished,
}: {
  intro: SkillIntro;
  childId: string;
  onFinished: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    finished.current = false;
    const started = Date.now();
    const timer = window.setInterval(() => {
      const nextElapsed = Date.now() - started;
      setElapsed(nextElapsed);
      if (nextElapsed < intro.seconds * 1000 || finished.current) return;
      finished.current = true;
      window.clearInterval(timer);
      onFinishedRef.current();
      void markIntroSeen(childId, intro.skillId, intro.cycle);
    }, 200);
    return () => window.clearInterval(timer);
  }, [childId, intro.cycle, intro.seconds, intro.skillId]);

  const progress = introProgress(elapsed, intro.seconds, intro.beats.length);
  const beat = intro.beats[progress.beat];
  const remaining = progress.remaining;

  return (
    <section className={`intro-card intro-${intro.style}`} aria-label="Topic introduction">
      <p className="eyebrow">Topic introduction</p>
      {intro.asset ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={intro.asset} alt="" className="intro-asset" />
      ) : (
        <p className="intro-placeholder">{intro.placeholder}</p>
      )}
      {beat?.prompt ? <p className="intro-example">{beat.prompt}</p> : null}
      {beat?.caption && beat.caption !== beat.prompt ? <p className="mt-3">{beat.caption}</p> : null}
      {beat?.steps && beat.steps.length > 0 ? (
        <ol className="steps">
          {beat.steps.map((step, index) => (
            <li key={`${intro.skillId}-intro-${progress.beat}-${index}`}>{step}</li>
          ))}
        </ol>
      ) : null}
      {beat?.answer ? <p className="mt-2">Answer: {beat.answer}</p> : null}
      <p className="intro-timer" role="timer">
        Practice starts in {remaining} {remaining === 1 ? "second" : "seconds"}.
      </p>
    </section>
  );
}

function gradeNote(
  grade: SupportedGrade,
  access: PracticeView["access"],
  requestedGrade: SupportedGrade | null,
): string {
  if (grade === access.working) return "Working in this grade. Questions and review stay here.";
  if (requestedGrade === grade) return "Waiting for a parent to approve this grade.";
  if (grade === access.enrolled) return "Enrolled grade. Choosing a topic moves practice back here.";
  const next = nextEnrolledGrade(access.enrolled);
  if (access.nextUnlocked && next === grade) {
    return "Unlocked early. Choosing a topic moves practice here.";
  }
  if (gradeIsOpen(access, grade)) return "Choosing a topic moves practice here.";
  return "Visible without finishing the earlier grade. Choosing a topic asks a parent to approve it.";
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