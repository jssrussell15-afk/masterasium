"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { IntroModal } from "@/components/intro-modal";
import { QuestionPractice } from "@/components/question-practice";
import { Scratchpad } from "@/components/scratchpad";
import { logPracticeEvent, markIntroSeen, practiceAction } from "@/lib/practice/actions";
import { PRACTICE_SET_SIZE } from "@/lib/practice/feedback";
import { introCardModel } from "@/lib/practice/intro";
import { allowsScratchpad } from "@/lib/practice/surface";
import { newAttemptId, draftForQuestion, markDraftSaved, rememberDraft, upsertDraft } from "@/lib/practice/draft-store";
import {
  carriedFields,
  draftFromForm,
  formDataFromDraft,
  prepareAttemptFields,
  submitShouldRetry,
} from "@/lib/practice/resilient-submit";
import { flushDraft } from "@/lib/practice/submit-queue";
import type { PracticeState, PracticeView, QuestionKind } from "@/lib/practice/types";
import type { FeedbackPhase } from "@/lib/practice/feedback";
import type { AttemptDraft } from "@/lib/practice/draft-store";

function kindLabel(kind: QuestionKind): string {
  if (kind === "review") return "Review";
  if (kind === "check") return "Show what you know";
  if (kind === "support") return "Practice";
  return "Focus";
}

const initial: PracticeState = {};

export function PracticeSession({ view }: { view: PracticeView }) {
  const appliedCheck = useRef("");
  const epoch = useRef(0);
  const runRef = useRef<(previous: PracticeState, formData: FormData) => Promise<PracticeState>>(
    async (previous) => previous,
  );
  const heldRef = useRef<PracticeState>(initial);
  const [held, setHeld] = useState<PracticeState>(initial);
  const [saveNote, setSaveNote] = useState<"saving" | "saved" | null>(null);
  function commit(next: PracticeState) {
    heldRef.current = next;
    setHeld(next);
  }
  const [attemptId, setAttemptId] = useState("");
  const [checkId, setCheckId] = useState("");
  const [localDraft, setLocalDraft] = useState("");
  const dispatch = useCallback(
    (previous: PracticeState, formData: FormData) =>
      runRef.current(previous, formData).then((result) => {
        commit(result);
        return result;
      }),
    [],
  );
  const [, formAction, pending] = useActionState(dispatch, initial);
  const state = held;
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
  const restoredDraft = question.resume?.draft || localDraft;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = draftForQuestion(window.localStorage, view.childId, question.questionId);
    appliedCheck.current = "";
    if (stored) {
      setAttemptId(stored.attemptId);
      setCheckId(question.resume ? newAttemptId() : stored.checkId);
      setLocalDraft(
        question.resume ? "" : stored.remainder ? `${stored.answer} r ${stored.remainder}` : stored.answer,
      );
      return;
    }
    setAttemptId(newAttemptId());
    setCheckId(newAttemptId());
    setLocalDraft("");
  }, [question.questionId, view.childId]);

  useEffect(() => {
    if (seenQuestion.current === question.questionId) return;
    seenQuestion.current = question.questionId;
    setCompleted((count) => count + 1);
    setSaveNote(null);
  }, [question.questionId]);

  function retryLater(
    draft: AttemptDraft,
    extra: { name: string; value: string }[],
    token: number,
  ) {
    if (typeof window === "undefined") return;
    void flushDraft({
      draft,
      storage: window.localStorage,
      send: async (item) => {
        try {
          const result = await practiceAction({}, formDataFromDraft(item, extra));
          if (token !== epoch.current) return { ok: true };
          if (!result.error) {
            if (item.intent === "check" || item.intent === "show-how") appliedCheck.current = item.checkId;
            commit({ ...result, saveNote: "saved" });
            setSaveNote("saved");
            return { ok: true };
          }
          return { ok: false, retry: submitShouldRetry(result.error, false) };
        } catch {
          return { ok: false, retry: true };
        }
      },
      onStatus: (status) => {
        if (token !== epoch.current) return;
        setSaveNote(status);
      },
    });
  }

  runRef.current = async (_previous, formData) => {
    const previous = heldRef.current;
    const token = ++epoch.current;
    prepareAttemptFields({
      formData,
      appliedCheckId: appliedCheck.current,
      nextId: newAttemptId,
    });
    const nextCheck = String(formData.get("checkId") ?? "");
    const nextAttempt = String(formData.get("attemptId") ?? "");
    if (nextCheck) setCheckId(nextCheck);
    if (nextAttempt) setAttemptId(nextAttempt);
    const draft = draftFromForm(formData);
    const extra = carriedFields(formData);
    if (draft && typeof window !== "undefined") upsertDraft(window.localStorage, draft);
    try {
      const result = await practiceAction(previous, formData);
      if (token !== epoch.current) return result;
      if (!result.error) {
        if (draft && (draft.intent === "check" || draft.intent === "show-how")) {
          appliedCheck.current = draft.checkId;
        }
        if (draft && typeof window !== "undefined") markDraftSaved(window.localStorage, draft.attemptId);
        if (result.saveNote) setSaveNote(result.saveNote);
        return result;
      }
      if (!draft || !submitShouldRetry(result.error, false)) return result;
      setSaveNote("saving");
      retryLater(draft, extra, token);
      return { ...previous, error: undefined, saveNote: "saving" };
    } catch {
      if (token !== epoch.current) return { ...previous, saveNote: "saving" };
      if (draft) {
        setSaveNote("saving");
        retryLater(draft, extra, token);
        return { ...previous, error: undefined, saveNote: "saving" };
      }
      return { ...previous, error: "That answer is still on this screen." };
    }
  };

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

  function rememberAnswer(answer: string, remainder: string) {
    if (!attemptId || !checkId || typeof window === "undefined") return;
    const intent: AttemptDraft["intent"] = phase === "correct" || phase === "revealed" ? "next" : "check";
    rememberDraft(window.localStorage, {
      attemptId,
      checkId,
      childId: view.childId,
      questionId: question.questionId,
      answer,
      remainder,
      intent,
      status: "draft",
    });
  }

  const intro = question.intro;
  const fields = [
    { name: "childId", value: view.childId },
    { name: "questionId", value: question.questionId },
    { name: "attemptId", value: attemptId },
    { name: "checkId", value: checkId },
    { name: "elapsedSeconds", value: "0" },
    ...(intro
      ? [
          { name: "introSkillId", value: intro.skillId },
          { name: "introCycle", value: intro.cycle },
        ]
      : []),
  ];
  const shownSave = saveNote ?? state.saveNote ?? null;

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
          draft={restoredDraft}
          pending={pending}
          saveNote={shownSave}
          assist={question.assist}
          aside={allowsScratchpad(grade) ? <Scratchpad /> : undefined}
          action={formAction}
          fields={fields}
          onElapsed={stampElapsed}
          onDraft={rememberAnswer}
        />
      )}
    </div>
  );
}
