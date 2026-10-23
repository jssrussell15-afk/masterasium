"use client";

import { HighlightedWords, ListenButton, useSpoken } from "@/components/listen";
import { ExampleVisualView } from "@/components/example-visual";
import type { WorkedExample } from "@/lib/practice/example";

export function WorkedExamplePanel({
  example,
  stepIndex,
  autoRead = false,
  onNext,
  onBackToQuestion,
}: {
  example: WorkedExample;
  stepIndex: number;
  /** Grades 1–2 hear each step when it appears. */
  autoRead?: boolean;
  onNext: () => void;
  onBackToQuestion: () => void;
}) {
  const steps = example.steps;
  const index = Math.min(Math.max(stepIndex, 0), Math.max(steps.length - 1, 0));
  const step = steps[index] ?? "";
  const last = index >= steps.length - 1;
  const visual = example.visuals?.[index] ?? null;
  const speech = useSpoken(step, { auto: autoRead, rate: autoRead ? 0.85 : undefined });

  return (
    <aside className="show-me worked-example-panel" aria-label="Worked example">
      <p className="example-kicker">A similar question</p>
      <p className="example-prompt">{example.prompt}</p>
      <div className="show-me-bar">
        <ListenButton speaking={speech.speaking} onClick={speech.toggle} />
        <p className="show-me-caption" aria-live="polite">
          <HighlightedWords text={step} activeWord={speech.activeWord} />
        </p>
        <span className="show-me-count">
          Step {index + 1} of {steps.length}
        </span>
        {last ? (
          <button type="button" className="btn btn-primary show-me-next" onClick={onBackToQuestion}>
            Back to my question
          </button>
        ) : (
          <button type="button" className="btn btn-primary show-me-next" onClick={onNext}>
            Next step
          </button>
        )}
      </div>
      {visual ? (
        <div className="show-me-stage">
          <ExampleVisualView visual={visual} />
        </div>
      ) : null}
    </aside>
  );
}
