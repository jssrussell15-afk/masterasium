"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { IntroModal } from "@/components/intro-modal";
import { QuestionPractice } from "@/components/question-practice";
import { Scratchpad } from "@/components/scratchpad";
import { logPracticeEvent, markIntroSeen, practiceAction } from "@/lib/practice/actions";
import { PRACTICE_SET_SIZE } from "@/lib/practice/feedback";
import { introCardModel } from "@/lib/practice/intro";
import { allowsScratchpad } from "@/lib/practice/surface";
import type { PracticeState, PracticeView, QuestionKind } from "@/lib/practice/types";
import type { FeedbackPhase } from "@/lib/practice/feedback";

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
  const card = question.intro ? introCardModel(question.intro, question.prompt) : null;
  const introToken = question.intro && card ? `${question.questionId}:${question.intro.skillId}:${question.intro.cycle}` : "";
  const [finishedIntro, setFinishedIntro] = useState("");
  const showingIntro = card != null && question.intro != null && finishedIntro !== introToken;
  const startedAt = useRef<number | null>(null);
  const submitted = useRef(false);
  const seenQuestion = useRef(question.questionId);
  const [completed, setCompleted] = useState(0);
  const grade = state.workingGrade ?? view.grade;
  const phase: FeedbackPhase =
    state.feedbackFor === question.questionId && state.phase
      ? state.phase
      : (question.resume?.phase ?? "answering");
  const why =
    state.feedbackFor === question.questionId ? (state.why ?? null) : (question.resume?.why ?? null);
  const steps =
    state.feedbackFor === question.questionId ? (state.steps ?? []) : (question.resume?.steps ?? []);
  const expected =
    state.feedbackFor === question.questionId
      ? (state.expected ?? null)
      : (question.resume?.expected ?? null);

  useEffect(() => {
    if (seenQuestion.current === question.questionId) return;
    seenQuestion.current = question.questionId;
    setCompleted((count) => count + 1);
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

  function stampElapsed(form: HTMLFormElement) {
    const intent = String(new FormData(form).get("intent") ?? "");
    if (intent === "next") submitted.current = true;
    const input = form.elements.namedItem("elapsedSeconds");
    if (!(input instanceof HTMLInputElement) || startedAt.current == null) return;
    input.value = String(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)));
  }

  const intro = question.intro;
  const fields = [
    { name: "childId", value: view.childId },
    { name: "questionId", value: question.questionId },
    { name: "elapsedSeconds", value: "0" },
    ...(intro
      ? [
          { name: "introSkillId", value: intro.skillId },
          { name: "introCycle", value: intro.cycle },
        ]
      : []),
  ];

  return (
    <div className="question-screen">
      <p className="question-back">
        <Link className="home-link" href="/practice">
          All skills
        </Link>
      </p>
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
      {showingIntro && intro && card ? (
        <IntroModal
          key={introToken}
          title={question.skillTitle}
          sentences={card.sentences}
          example={card.example}
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
        <QuestionPractice
          questionId={question.questionId}
          eyebrow={`${kindLabel(question.kind)} · ${question.skillTitle}`}
          prompt={question.prompt}
          responseHint={question.responseHint}
          shape={question.shape}
          hint={question.hints?.hint ?? null}
          example={question.example ?? null}
          progress={{ index: (completed % PRACTICE_SET_SIZE) + 1, total: PRACTICE_SET_SIZE }}
          phase={phase}
          why={why}
          steps={steps}
          expected={expected}
          draft={question.resume?.draft ?? ""}
          pending={pending}
          assist={question.assist}
          walk={question.walk ?? null}
          aside={allowsScratchpad(grade) ? <Scratchpad /> : undefined}
          action={action}
          fields={fields}
          onElapsed={stampElapsed}
        />
      )}
    </div>
  );
}
