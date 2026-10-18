"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AnswerFields, answerUsesKeypad } from "@/components/answer-fields";
import { AssistedPrompt } from "@/components/assisted-prompt";
import { SomethingLooksWrong } from "@/components/something-looks-wrong";
import type { WorkedExample } from "@/lib/practice/example";
import { progressLabel, type FeedbackPhase } from "@/lib/practice/feedback";
import type { AnswerShape } from "@/lib/practice/parts";
import type { AssistView } from "@/lib/practice/types";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

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
  report = null,
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
  report?: { enabled: boolean; childId: string; skillId: string; itemId?: string | null } | null;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => valuesFor(shape, draft));
  const [hintOpen, setHintOpen] = useState(false);
  const [exampleOpen, setExampleOpen] = useState(exampleStartsOpen);
  const [activeField, setActiveField] = useState("answer");
  const inputRef = useRef<HTMLInputElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const finished = phase === "correct" || phase === "revealed";
  const showHint = Boolean(hint) && (hintOpen || phase === "retry" || phase === "revealed");
  const progressText = progress ? progressLabel(progress.index, progress.total) : null;
  const announcement =
    phase === "correct" ? "That's right." : phase === "retry" ? "Not quite. Try again." : phase === "revealed" ? "Here's how." : "";

  useEffect(() => {
    setValues(valuesFor(shape, draft));
    setHintOpen(false);
    setExampleOpen(exampleStartsOpen);
    setActiveField("answer");
    // A parent re-render must not wipe a retry the child is still typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId]);

  useEffect(() => {
    if (phase !== "retry") return;
    const node = inputRef.current;
    if (!node) return;
    node.focus();
    node.select();
  }, [phase, questionId]);

  useEffect(() => {
    if (!finished) return;
    nextRef.current?.focus();
  }, [finished, questionId]);

  function typeDigit(digit: string) {
    if (finished || pending) return;
    setValues((current) => ({
      ...current,
      [activeField]: `${current[activeField] ?? ""}${digit}`,
    }));
    inputRef.current?.focus();
  }

  function deleteDigit() {
    if (finished || pending) return;
    setValues((current) => ({
      ...current,
      [activeField]: (current[activeField] ?? "").slice(0, -1),
    }));
    inputRef.current?.focus();
  }

  function stamp(event: FormEvent<HTMLFormElement>) {
    onElapsed?.(event.currentTarget);
  }

  return (
    <div className="question-column">
      {progressText ? <p className="question-progress">{progressText}</p> : null}
      <div className={aside ? "question-layout with-pad" : "question-layout"}>
      <section className="question-card" aria-label="Question">
        <p className="topic-label">{eyebrow}</p>
        <h1 className={prompt.length > 80 ? "prompt prompt-long" : "prompt"}>{prompt}</h1>
        {responseHint ? <p className="hint">{responseHint}</p> : null}
        {phase === "answering" ? <AssistedPrompt assist={assist} /> : null}
        {guideSteps.length > 0 && phase === "answering" ? (
          <div className="walk-card">
            <ol className="guide-steps">
              {guideSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {report ? (
              <SomethingLooksWrong
                enabled={report.enabled}
                surface="walkthrough"
                childId={report.childId}
                skillId={report.skillId}
                itemId={report.itemId}
                prompt={prompt}
              />
            ) : null}
          </div>
        ) : null}
        {showHint && hint ? <p className="inline-help">{hint}</p> : null}
        {exampleOpen && example ? <WorkedExampleBlock example={example} /> : null}
        <p className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
        {phase === "correct" && why ? <p className="why-line">{why}</p> : null}
        {phase === "retry" ? <p className="feedback warm">Not quite. Try again.</p> : null}
        {phase === "correct" ? <p className="feedback good">That's right.</p> : null}
        {phase === "revealed" ? (
          <div className="feedback warm worked-reveal">
            <p>Here's how.</p>
            {steps.length > 0 ? (
              <ol className="guide-steps">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            {expected ? (
              <p>
                The answer is <strong>{expected}</strong>.
              </p>
            ) : null}
            {report ? (
              <SomethingLooksWrong
                enabled={report.enabled}
                surface="explanation"
                childId={report.childId}
                skillId={report.skillId}
                itemId={report.itemId}
                prompt={prompt}
              />
            ) : null}
          </div>
        ) : null}

        <form action={action} className="question-form" onSubmit={stamp}>
          <HiddenFields fields={fields} />
          <input type="hidden" name="intent" value={finished ? "next" : "check"} />
          <AnswerFields
            shape={shape}
            values={values}
            onChange={(name, value) => setValues((current) => ({ ...current, [name]: value }))}
            readOnly={finished}
            disabled={pending}
            inputRef={inputRef}
            onFocusField={setActiveField}
          />
          {answerUsesKeypad(shape) ? (
            <NumberKeypad disabled={finished || pending} onDigit={typeDigit} onDelete={deleteDigit} />
          ) : null}
          <button
            ref={finished ? nextRef : undefined}
            className="btn btn-primary question-submit"
            type="submit"
            disabled={pending || !action}
          >
            {pending ? "One moment…" : finished ? "Next" : "Check"}
          </button>
        </form>

        {finished ? null : (
          <div className="help-row">
            <button
              type="button"
              className="help-target"
              disabled={pending || !hint}
              onClick={() => setHintOpen(true)}
            >
              Hint
            </button>
            {example ? (
              <button
                type="button"
                className="help-target"
                disabled={pending}
                onClick={() => setExampleOpen(true)}
              >
                Show me an example
              </button>
            ) : null}
            <form action={action} onSubmit={stamp}>
              <HiddenFields fields={fields} />
              <input type="hidden" name="intent" value="show-how" />
              <button className="help-target" type="submit" disabled={pending || !action}>
                Show me how
              </button>
            </form>
          </div>
        )}
        {report ? (
          <SomethingLooksWrong
            enabled={report.enabled}
            surface="question"
            childId={report.childId}
            skillId={report.skillId}
            itemId={report.itemId}
            prompt={prompt}
          />
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

function NumberKeypad({
  disabled,
  onDigit,
  onDelete,
}: {
  disabled: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="number-pad" role="group" aria-label="Number keypad">
      {DIGITS.map((digit) => (
        <button key={digit} type="button" disabled={disabled} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      <span aria-hidden="true" />
      <button type="button" disabled={disabled} onClick={() => onDigit("0")}>
        0
      </button>
      <button type="button" data-key="delete" aria-label="Delete" disabled={disabled} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
