"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useActionState } from "react";
import { AnswerFields } from "@/components/answer-fields";
import { HintBubbles, type HintRung } from "@/components/hint-bubbles";
import { IntroModal } from "@/components/intro-modal";
import { QuestionCard } from "@/components/question-card";
import { Scratchpad } from "@/components/scratchpad";
import { logPracticeEvent, markIntroSeen, practiceAction } from "@/lib/practice/actions";
import type { HintLadder } from "@/lib/practice/hints";
import { allowsScratchpad } from "@/lib/practice/surface";
import type { PracticeState, PracticeView, QuestionKind } from "@/lib/practice/types";

function kindLabel(kind: QuestionKind): string {
  if (kind === "review") return "Review";
  if (kind === "check") return "Show what you know";
  if (kind === "support") return "Practice";
  return "Focus";
}

const initial: PracticeState = {};
const HINT_FALLBACK: HintLadder = {
  hint: "Name what the question is asking, then do the first step.",
  example: "Use the same steps as the worked example, with this question's numbers.",
};

export function PracticeSession({ view }: { view: PracticeView }) {
  const [state, action, pending] = useActionState(practiceAction, initial);
  const question = state.next ?? view.question;
  const intro = question.intro ?? null;
  const introToken = intro ? `${question.questionId}:${intro.skillId}:${intro.cycle}` : "";
  const [finishedIntro, setFinishedIntro] = useState("");
  const showingIntro = intro != null && finishedIntro !== introToken;
  const [rung, setRung] = useState<HintRung | null>(null);
  const startedAt = useRef<number | null>(null);
  const submitted = useRef(false);
  const grade = state.workingGrade ?? view.grade;
  const hints = question.hints ?? HINT_FALLBACK;

  useEffect(() => {
    setRung(null);
  }, [question.questionId]);

  useEffect(() => {
    if (showingIntro) return;
    const started = Date.now();
    startedAt.current = started;
    submitted.current = false;
    return () => {
      if (submitted.current) return;
      const seconds = Math.max(0, Math.round((Date.now() - started) / 1000));
      void logPracticeEvent(view.childId, "time_on_task", question.skillId, { seconds }).catch(
        () => undefined,
      );
    };
  }, [question.questionId, question.skillId, showingIntro, view.childId]);

  function stampElapsed(event: FormEvent<HTMLFormElement>) {
    submitted.current = true;
    const input = event.currentTarget.elements.namedItem("elapsedSeconds");
    if (!(input instanceof HTMLInputElement) || startedAt.current == null) return;
    input.value = String(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
  }

  function chooseRung(next: HintRung) {
    setRung(next);
    void logPracticeEvent(view.childId, "hint_rung", question.skillId, { rung: next }).catch(
      () => undefined,
    );
  }

  const bubble = rung === "hint" ? hints.hint : rung === "example" ? hints.example : null;

  return (
    <div className="question-screen">
      <p className="question-back">
        <Link href="/practice">All skills</Link>
      </p>
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

      {showingIntro && intro ? (
        <IntroModal
          key={introToken}
          intro={intro}
          onViewed={() => {
            void logPracticeEvent(view.childId, "intro_viewed", intro.skillId, {
              cycle: intro.cycle,
            }).catch(() => undefined);
          }}
          onFinished={() => {
            void markIntroSeen(view.childId, intro.skillId, intro.cycle);
            setFinishedIntro(introToken);
          }}
        />
      ) : (
        <QuestionCard
          eyebrow={`${kindLabel(question.kind)} · ${question.skillTitle}`}
          prompt={question.prompt}
          responseHint={question.responseHint}
          aside={allowsScratchpad(grade) ? <Scratchpad /> : undefined}
        >
          <form action={action} className="question-form" onSubmit={stampElapsed}>
            <input type="hidden" name="intent" value="answer" />
            <input type="hidden" name="childId" value={view.childId} />
            <input type="hidden" name="questionId" value={question.questionId} />
            <input type="hidden" name="elapsedSeconds" defaultValue="0" />
            {intro ? (
              <>
                <input type="hidden" name="introSkillId" value={intro.skillId} />
                <input type="hidden" name="introCycle" value={intro.cycle} />
              </>
            ) : null}
            <AnswerFields shape={question.shape} />
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Checking…" : "Check"}
            </button>
          </form>
        </QuestionCard>
      )}

      {showingIntro ? null : (
        <HintBubbles
          message={bubble}
          pending={pending}
          onRung={chooseRung}
          giveUp={
            <form action={action} onSubmit={stampElapsed}>
              <input type="hidden" name="intent" value="give-up" />
              <input type="hidden" name="childId" value={view.childId} />
              <input type="hidden" name="questionId" value={question.questionId} />
              <input type="hidden" name="elapsedSeconds" defaultValue="0" />
              {intro ? (
                <>
                  <input type="hidden" name="introSkillId" value={intro.skillId} />
                  <input type="hidden" name="introCycle" value={intro.cycle} />
                </>
              ) : null}
              <button className="hint-target" type="submit" disabled={pending}>
                I give up
              </button>
            </form>
          }
        />
      )}
    </div>
  );
}
