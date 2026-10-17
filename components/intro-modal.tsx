"use client";

import { useEffect, useRef, useState } from "react";
import { introProgress, type SkillIntro } from "@/lib/practice/intro-view";

export function IntroModal({
  intro,
  onFinished,
  onViewed,
}: {
  intro: SkillIntro;
  onFinished: () => void;
  onViewed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);
  const onFinishedRef = useRef(onFinished);
  const onViewedRef = useRef(onViewed);
  onFinishedRef.current = onFinished;
  onViewedRef.current = onViewed;

  useEffect(() => {
    onViewedRef.current();
  }, [intro.skillId, intro.cycle]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (!node.open) node.showModal();
    const block = (event: Event) => event.preventDefault();
    node.addEventListener("cancel", block);
    return () => {
      node.removeEventListener("cancel", block);
      if (node.open) node.close();
    };
  }, [intro.skillId, intro.cycle]);

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
    }, 200);
    return () => window.clearInterval(timer);
  }, [intro.cycle, intro.seconds, intro.skillId]);

  const progress = introProgress(elapsed, intro.seconds, intro.beats.length);
  const beat = intro.beats[progress.beat];
  const remaining = progress.remaining;

  return (
    <dialog ref={dialog} className="intro-dialog" aria-label="Topic introduction">
      <section className={`intro-card intro-${intro.style}`}>
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
    </dialog>
  );
}
