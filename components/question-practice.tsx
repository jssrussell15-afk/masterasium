"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnswerFields, answerUsesKeypad } from "@/components/answer-fields";
import { AssistedPrompt } from "@/components/assisted-prompt";
import { NumberKeypad } from "@/components/number-keypad";
import { HighlightedPrompt, LightbulbIcon, ShowMePanel } from "@/components/show-me";
import { answersMatch } from "@/lib/practice/answers";
import { whyPromptsEnabled } from "@/lib/practice/why-flag";
import type { WorkedExample } from "@/lib/practice/example";
import { progressLabel, type FeedbackPhase } from "@/lib/practice/feedback";
import type { AnswerShape } from "@/lib/practice/parts";
import type { AssistView } from "@/lib/practice/types";
import type { Walkthrough } from "@/lib/practice/walk";

export function QuestionPractice({
  questionId,
  eyebrow,
  prompt,
  responseHint,
  shape,
  hint,
  example,
  progress,
  phase,
  why,
  steps,
  expected,
  draft = "",
  exampleStartsOpen = false,
  pending = false,
  guideSteps = [],
  assist = null,
  aside,
  action,
  fields = [],
  onElapsed,
  walk = null,
  handoffIntent = "your-turn",
  walkStart = null,
}: {
  questionId: string;
  eyebrow: string;
  prompt: string;
  responseHint: string | null;
  shape: AnswerShape;
  hint: string | null;
  example: WorkedExample | null;
  progress: { index: number; total: number } | null;
  phase: FeedbackPhase;
  why: string | null;
  steps: string[];
  expected: string | null;
  /** Restored typed answer when the question is reopened. */
  draft?: string;
  exampleStartsOpen?: boolean;
  pending?: boolean;
  guideSteps?: string[];
  assist?: AssistView | null;
  aside?: ReactNode;
  action?: (formData: FormData) => void;
  fields?: { name: string; value: string }[];
  onElapsed?: (form: HTMLFormElement) => void;
  walk?: Walkthrough | null;
  /** Practice asks for a same-skill question. A lesson continues its own path. */
  handoffIntent?: string;
  /** Opens a still frame for screenshots and tests. */
  walkStart?: { step: number; handoff?: boolean; hint?: boolean } | null;
}) {
  const guided = walk && walk.steps.length >= 3 ? walk : null;
  const [values, setValues] = useState<Record<string, string>>(() => valuesFor(shape, draft));
  const [hintOpen, setHintOpen] = useState(Boolean(walkStart?.hint));
  const [exampleOpen, setExampleOpen] = useState(exampleStartsOpen);
  const [activeField, setActiveField] = useState("answer");
  const [dismissed, setDismissed] = useState(false);
  const [localOpen, setLocalOpen] = useState(Boolean(walkStart && !walkStart.hint));
  const [stepIndex, setStepIndex] = useState(walkStart?.step ?? 0);
  const [handoff, setHandoff] = useState(Boolean(walkStart?.handoff));
  const [walkDraft, setWalkDraft] = useState("");
  const [walkMiss, setWalkMiss] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const solution = guided?.answer || expected || "";
  const serverOpen = phase === "revealed" && Boolean(guided);
  const walking = Boolean(guided) && !dismissed && (serverOpen || localOpen || Boolean(walkStart && !walkStart.hint));
  const showTextReveal = phase === "revealed" && !guided;
  const textFinished = phase === "correct" || showTextReveal;
  const showHint = Boolean(hint) && !walking && (hintOpen || phase === "retry" || showTextReveal);
  const progressText = progress ? progressLabel(progress.index, progress.total) : null;
  const step = guided?.steps[Math.min(stepIndex, guided.steps.length - 1)];
  const announcement = walking
    ? ""
    : phase === "correct"
      ? "That's right."
      : phase === "retry"
        ? "Not quite. Try again."
        : phase === "revealed"
          ? "Here's how."
          : "";

  useEffect(() => {
    setValues(valuesFor(shape, draft));
    setHintOpen(Boolean(walkStart?.hint));
    setExampleOpen(exampleStartsOpen);
    setActiveField("answer");
    setDismissed(false);
    setLocalOpen(Boolean(walkStart && !walkStart.hint));
    setStepIndex(walkStart?.step ?? 0);
    setHandoff(Boolean(walkStart?.handoff));
    setWalkDraft("");
    setWalkMiss(false);
    // A parent re-render must not wipe a retry the child is still typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  useEffect(() => {
    if (phase !== "retry" || walking) return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [phase, questionId, walking]);

  useEffect(() => {
    if (!textFinished) return;
    nextRef.current?.focus();
  }, [textFinished, questionId]);

  function typeDigit(digit: string) {
    if (textFinished || pending) return;
    setValues((current) => ({
      ...current,
      [activeField]: `${current[activeField] ?? ""}${digit}`,
    }));
    inputRef.current?.focus();
  }

  function deleteDigit() {
    if (textFinished || pending) return;
    setValues((current) => ({
      ...current,
      [activeField]: (current[activeField] ?? "").slice(0, -1),
    }));
    inputRef.current?.focus();
  }

  function typeWalkDigit(digit: string) {
    if (pending) return;
    setWalkMiss(false);
    setWalkDraft((current) => `${current}${digit}`);
  }

  function deleteWalkDigit() {
    if (pending) return;
    setWalkMiss(false);
    setWalkDraft((current) => current.slice(0, -1));
  }

  function goNext() {
    if (!guided || handoff) return;
    if (stepIndex < guided.steps.length - 1) {
      setWalkMiss(false);
      setStepIndex((current) => current + 1);
      return;
    }
    if (!solution || !answersMatch(solution, walkDraft)) {
      setWalkMiss(true);
      return;
    }
    setWalkMiss(false);
    setHandoff(true);
  }

  function openWalk(event: { preventDefault: () => void }) {
    if (phase === "revealed" || !action) {
      event.preventDefault();
      setDismissed(false);
      setLocalOpen(true);
    }
  }

  function stamp(event: FormEvent<HTMLFormElement>) {
    onElapsed?.(event.currentTarget);
  }

  const extraKey = solution.includes("/") ? "/" : solution.includes(":") ? ":" : null;
  const showWalkPad = Boolean(solution) && (/^\d+$/.test(solution) || extraKey != null);
  const hideMainForm = walking;
  const showHelp = phase !== "correct" && !showTextReveal && !walking;
  const formIntent = handoff ? handoffIntent : textFinished ? "next" : "check";
  const formLabel = handoff || textFinished ? "Next" : "Check";

  return (
    <div className="question-column">
      {walking ? <div className="walk-dim" /> : null}
      {progressText ? <p className="question-progress">{progressText}</p> : null}
      <div className={aside ? "question-layout with-pad" : "question-layout"}>
        <section className={walking ? "question-card walk-raised" : "question-card"} aria-label="Question">
          <p className="topic-label">{eyebrow}</p>
          <h1 className={prompt.length > 80 ? "prompt prompt-long" : "prompt"}>
            {walking && step && !handoff ? (
              <HighlightedPrompt prompt={prompt} target={step.target} occurrence={step.occurrence ?? 0} />
            ) : (
              prompt
            )}
          </h1>
          {responseHint ? <p className="hint">{responseHint}</p> : null}
          {phase === "answering" && !walking ? <AssistedPrompt assist={assist} /> : null}
          {guideSteps.length > 0 && phase === "answering" && !walking ? (
            <ol className="guide-steps">
              {guideSteps.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          ) : null}
          {showHint && hint ? (
            <p className="inline-help">
              <LightbulbIcon />
              <span>{hint}</span>
            </p>
          ) : null}
          {exampleOpen && example && !walking ? <WorkedExampleBlock example={example} /> : null}
          <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
          {phase === "correct" && why ? <p className="why-line">{why}</p> : null}
          {whyPromptsEnabled() ? <p className="why-prompt-slot" hidden /> : null}
          {phase === "retry" && !walking ? <p className="feedback warm">Not quite. Try again.</p> : null}
          {phase === "correct" ? <p className="feedback good">That's right.</p> : null}
          {showTextReveal ? (
            <div className="feedback warm worked-reveal">
              <p>Here's how.</p>
              {steps.length > 0 ? (
                <ol className="guide-steps">
                  {steps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : null}
              {expected ? (
                <p>
                  The answer is <strong>{expected}</strong>.
                </p>
              ) : null}
            </div>
          ) : null}

          {walking && guided && step ? (
            <ShowMePanel
              step={handoff ? guided.steps[guided.steps.length - 1] : step}
              index={handoff ? guided.steps.length - 1 : Math.min(stepIndex, guided.steps.length - 1)}
              total={guided.steps.length}
              handoff={handoff}
              draft={walkDraft}
              miss={walkMiss}
              pending={pending}
              showKeypad={showWalkPad}
              extraKey={extraKey}
              onDraft={(value) => {
                setWalkMiss(false);
                setWalkDraft(value);
              }}
              onDigit={typeWalkDigit}
              onDelete={deleteWalkDigit}
              onNext={goNext}
              onClose={() => setDismissed(true)}
              action={action}
              fields={fields}
              handoffIntent={handoffIntent}
              onElapsed={onElapsed}
            />
          ) : null}

          {hideMainForm ? null : (
            <form action={action} className="question-form" onSubmit={stamp}>
              <HiddenFields fields={fields} />
              <input type="hidden" name="intent" value={formIntent} />
              <AnswerFields
                shape={shape}
                values={values}
                onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
                readOnly={textFinished}
                disabled={pending}
                inputRef={inputRef}
                onFocusField={setActiveField}
              />
              {answerUsesKeypad(shape) ? (
                <NumberKeypad disabled={textFinished || pending} onDigit={typeDigit} onDelete={deleteDigit} />
              ) : null}
              <button
                ref={textFinished ? nextRef : undefined}
                className="btn btn-primary question-submit"
                type="submit"
                disabled={pending || !action}
              >
                {pending ? "One moment…" : formLabel}
              </button>
            </form>
          )}

          {showHelp ? (
            <div className="help-row">
              <button type="button" className="help-target" disabled={pending || !hint} onClick={() => setHintOpen(true)}>
                Help me with this
              </button>
              {example ? (
                <button type="button" className="help-target" disabled={pending} onClick={() => setExampleOpen(true)}>
                  Show me an example
                </button>
              ) : null}
              {guided ? (
                <form action={action} onSubmit={stamp}>
                  <HiddenFields fields={fields} />
                  <input type="hidden" name="intent" value="show-me" />
                  <button className="help-target" type="submit" disabled={pending} onClick={openWalk}>
                    Show me
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
        </section>
        {aside}
      </div>
    </div>
  );
}

function valuesFor(shape: AnswerShape, draft: string): Record<string, string> {
  if (!draft) return {};
  if (shape.kind === "single") return { answer: draft };
  const match = draft.match(/^(\d+)\s*r\s*(\d+)$/i);
  if (!match) return {};
  return { answer: match[1] ?? "", remainder: match[2] ?? "" };
}

function HiddenFields({ fields }: { fields: { name: string; value: string }[] }) {
  return (
    <>
      {fields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}
    </>
  );
}

function WorkedExampleBlock({ example }: { example: WorkedExample }) {
  return (
    <aside className="worked-example" aria-label="Worked example">
      <p className="topic-label">Example</p>
      <p className="example-prompt">{example.prompt}</p>
      <ol className="guide-steps">
        {example.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        Answer: <strong>{example.answer}</strong>
      </p>
    </aside>
  );
}
