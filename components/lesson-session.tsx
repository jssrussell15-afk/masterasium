"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AnswerFields } from "@/components/answer-fields";
import { lessonAction, type LessonClientState } from "@/lib/lesson/actions";
import type { LessonScreen } from "@/lib/lesson/screen";

export function LessonSession({
  initial,
  childId,
  skillId,
}: {
  initial: LessonClientState;
  childId: string;
  skillId: string;
}) {
  const [state, action, pending] = useActionState(lessonAction, initial);
  return (
    <LessonView
      screen={state.screen}
      error={state.error}
      pending={pending}
      action={action}
      childId={childId}
      skillId={skillId}
    />
  );
}

export function LessonView({
  screen,
  error,
  pending = false,
  action,
  childId,
  skillId,
  sampleHref,
}: {
  screen: LessonScreen;
  error?: string;
  pending?: boolean;
  action?: (formData: FormData) => void;
  childId?: string;
  skillId?: string;
  sampleHref?: string;
}) {
  return (
    <div className="lesson-screen">
      <p className="question-back">
        <Link href="/practice">All skills</Link>
      </p>
      {error ? (
        <p className="feedback bad" role="alert">
          {error}
        </p>
      ) : null}
      {screen.kind === "intro" ? (
        <section className="card grid gap-4" aria-label="Lesson introduction">
          <p className="eyebrow">{screen.eyebrow}</p>
          <h1 className="display text-4xl">{screen.title}</h1>
          <VideoSlot video={screen.video} />
          <p className="text-xl leading-snug">{screen.summary}</p>
          <StepForm
            action={action}
            childId={childId}
            skillId={skillId}
            intent="continue"
            pending={pending}
            label="Start"
            sampleHref={sampleHref}
          />
        </section>
      ) : null}
      {screen.kind === "worked" ? (
        <section className="card grid gap-4" aria-label="Worked example">
          <p className="eyebrow">{screen.eyebrow}</p>
          <h1 className="display text-3xl">{screen.title}</h1>
          {screen.lead ? <p className="text-lg">{screen.lead}</p> : null}
          <p className={numeralClass(screen.prompt)}>{screen.prompt}</p>
          <ol className="lesson-steps">
            {screen.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-xl">
            Answer: <strong>{screen.answer}</strong>
          </p>
          <StepForm
            action={action}
            childId={childId}
            skillId={skillId}
            intent="continue"
            pending={pending}
            label="Continue"
            sampleHref={sampleHref}
          />
        </section>
      ) : null}
      {screen.kind === "question" ? (
        <section className="card grid gap-4" aria-label="Question">
          <p className="eyebrow">{screen.eyebrow}</p>
          <h1 className={numeralClass(screen.prompt)}>{screen.prompt}</h1>
          {screen.steps.length > 0 ? (
            <ol className="lesson-steps">
              {screen.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {screen.responseHint ? <p className="hint">{screen.responseHint}</p> : null}
          {screen.hint ? (
            <details className="lesson-hint">
              <summary>Hint</summary>
              <p>{screen.hint}</p>
            </details>
          ) : null}
          {action && childId && skillId ? (
            <form action={action} className="grid gap-3">
              <input type="hidden" name="childId" value={childId} />
              <input type="hidden" name="skillId" value={skillId} />
              <input type="hidden" name="intent" value="answer" />
              <AnswerFields key={screen.taskKey} shape={screen.shape} />
              <button className="btn btn-primary lesson-tap" type="submit" disabled={pending}>
                {pending ? "Checking…" : "Check"}
              </button>
            </form>
          ) : (
            <p className="hint">The answer box is here on a real lesson.</p>
          )}
        </section>
      ) : null}
      {screen.kind === "feedback" ? (
        <section className="card grid gap-4" aria-label="What to look at" role="status">
          <p className="eyebrow">{screen.eyebrow}</p>
          <h1 className="display text-3xl">Look at this step</h1>
          <p className="text-xl leading-snug">{screen.note}</p>
          <p className="text-xl">
            The answer is <strong>{screen.expected}</strong>.
          </p>
          <StepForm
            action={action}
            childId={childId}
            skillId={skillId}
            intent="continue"
            pending={pending}
            label="Continue"
            sampleHref={sampleHref}
          />
        </section>
      ) : null}
      {screen.kind === "complete" ? (
        <section className="card grid gap-4" aria-label="What I learned">
          <p className="eyebrow">{screen.eyebrow}</p>
          <h1 className="display text-4xl">{screen.title}</h1>
          <p className="hint">You can tell a parent:</p>
          <p className="lesson-learned">{screen.sentence}</p>
          {screen.nextReview ? (
            <p className="hint">This comes back for a quiet review on {screen.nextReview}.</p>
          ) : (
            <p className="hint">This will come back in a day, a week, and a month.</p>
          )}
          <Link className="btn btn-primary lesson-tap" href="/practice">
            Back to skills
          </Link>
          <Link className="can-do-entry" href="/practice/can-do">
            Things I can do
          </Link>
        </section>
      ) : null}
    </div>
  );
}

function VideoSlot({ video }: { video: { id: string; title: string } | null }) {
  return (
    <div className="video-slot">
      {video ? (
        <>
          <p className="eyebrow">{video.id}</p>
          <p className="text-lg">{video.title}</p>
          <p className="hint">The video will play here when it is ready.</p>
        </>
      ) : (
        <p className="hint">A short video can go here. It is not ready yet.</p>
      )}
    </div>
  );
}

function StepForm({
  action,
  childId,
  skillId,
  intent,
  pending,
  label,
  sampleHref,
}: {
  action?: (formData: FormData) => void;
  childId?: string;
  skillId?: string;
  intent: string;
  pending: boolean;
  label: string;
  sampleHref?: string;
}) {
  if (!action || !childId || !skillId) {
    if (!sampleHref) return null;
    return (
      <Link className="btn btn-primary lesson-tap w-fit" href={sampleHref}>
        {label}
      </Link>
    );
  }
  return (
    <form action={action}>
      <input type="hidden" name="childId" value={childId} />
      <input type="hidden" name="skillId" value={skillId} />
      <input type="hidden" name="intent" value={intent} />
      <button className="btn btn-primary lesson-tap" type="submit" disabled={pending}>
        {pending ? "One moment…" : label}
      </button>
    </form>
  );
}

function numeralClass(prompt: string): string {
  return prompt.length <= 48 ? "lesson-numeral" : "lesson-prompt";
}
