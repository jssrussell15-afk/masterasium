"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ListenPassage } from "@/components/listen";

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
  const onFinishedEvent = useEffectEvent(onFinished);
  const onViewedEvent = useEffectEvent(onViewed);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    onViewedEvent();
  }, [title]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!node.open) node.showModal();
    startRef.current?.focus();
    const close = () => onFinishedEvent();
    node.addEventListener("cancel", close);
    return () => {
      node.removeEventListener("cancel", close);
      if (node.open && typeof node.close === "function") node.close();
    };
  }, [title]);

  return (
    <dialog ref={dialog} className="intro-dialog" aria-labelledby="intro-title">
      <section className="intro-card">
        <ListenPassage
          parts={[
            { text: title, as: "h1", className: "display", id: "intro-title" },
            ...sentences.map((sentence) => ({ text: sentence, as: "p" as const, className: "intro-sentence" })),
          ]}
        />
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
