"use client";

import { useEffect, useRef, useState } from "react";
import { ReadAloud } from "@/components/read-aloud";

export function IntroModal({
  title,
  sentences,
  example,
  onFinished,
  onViewed,
}: {
  title: string;
  sentences: string[];
  example: { prompt: string; steps: string[]; answer: string } | null;
  onFinished: () => void;
  onViewed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const onFinishedRef = useRef(onFinished);
  const onViewedRef = useRef(onViewed);
  const [showAnswer, setShowAnswer] = useState(false);
  const spoken = [
    title,
    ...sentences,
    example?.prompt ?? "",
    ...(example?.steps ?? []),
    showAnswer && example ? `Answer: ${example.answer}.` : "",
  ]
    .filter(Boolean)
    .join(". ");
  onFinishedRef.current = onFinished;
  onViewedRef.current = onViewed;

  useEffect(() => {
    onViewedRef.current();
  }, [title]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!node.open) node.showModal();
    startRef.current?.focus();
    const close = () => onFinishedRef.current();
    node.addEventListener("cancel", close);
    return () => {
      node.removeEventListener("cancel", close);
      if (node.open && typeof node.close === "function") node.close();
    };
  }, [title]);

  return (
    <dialog ref={dialog} className="intro-dialog" aria-labelledby="intro-title">
      <section className="intro-card">
        <div className="speak-row">
          <h1 id="intro-title" className="display">
            {title}
          </h1>
          <ReadAloud text={spoken} label="Speak the introduction" />
        </div>
        {sentences.map((sentence) => (
          <p key={sentence} className="intro-sentence">
            {sentence}
          </p>
        ))}
        {example ? (
          <div className="intro-example-block">
            <p className="example-prompt">{example.prompt}</p>
            {example.steps.length > 0 ? (
              <ol className="guide-steps">
                {example.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            ) : null}
            {showAnswer ? (
              <p>
                Answer: <strong>{example.answer}</strong>
              </p>
            ) : (
              <button type="button" className="help-target" onClick={() => setShowAnswer(true)}>
                Show answer
              </button>
            )}
          </div>
        ) : null}
        <button ref={startRef} className="btn btn-primary question-submit" type="button" onClick={() => onFinished()}>
          Start
        </button>
      </section>
    </dialog>
  );
}
