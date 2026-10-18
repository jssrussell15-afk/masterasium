"use client";

import { useState } from "react";
import { fadedIndexes, presentedSteps, whyAfterBuggy } from "@/lib/show-me/check";
import type { ShowTemplate } from "@/lib/show-me/types";
import { WHY_WRONG } from "@/lib/show-me/types";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"] as const;

export function ShowMeStyles({
  template,
  scene,
}: {
  template: ShowTemplate;
  scene: "guided" | "standard" | "buggy" | "fix" | "fallback";
}) {
  if (scene === "standard") return <StandardView template={template} />;
  if (scene === "buggy") return <BuggyView template={template} />;
  if (scene === "fix") return <FixView template={template} />;
  if (scene === "fallback") return <GuidedView template={template} note="We will walk this one." />;
  return <GuidedView template={template} />;
}

function GuidedView({ template, note }: { template: ShowTemplate; note?: string }) {
  const step = template.steps[template.steps.length - 1];
  return (
    <section className="show-style card" data-style="guided">
      <header className="show-style-head">
        <p className="show-style-title">Show me</p>
        <p className="show-style-count">Step {template.steps.length} of {template.steps.length}</p>
      </header>
      {note ? <p className="hint">{note}</p> : null}
      <Highlighted prompt={template.prompt} target="?" />
      <p className="show-style-caption">{step?.caption}</p>
      <label className="show-style-entry">
        <span className="hint">Your answer</span>
        <input className="eval-answer" inputMode="numeric" defaultValue="" />
      </label>
      <Keypad />
    </section>
  );
}

function StandardView({ template }: { template: ShowTemplate }) {
  const faded = new Set(fadedIndexes(template));
  return (
    <section className="show-style card" data-style="standard">
      <header className="show-style-head">
        <p className="show-style-title">Show me</p>
        <p className="show-style-count">Fill the faded steps</p>
      </header>
      <Highlighted prompt={template.prompt} target={template.highlight} />
      <ol className="show-style-steps">
        {template.steps.map((step, index) =>
          faded.has(index) ? (
            <li key={`${step.caption}-${index}`} className="show-style-faded">
              <span>{step.caption}</span>
              <input aria-label={`Step ${index + 1}`} defaultValue="" />
            </li>
          ) : (
            <li key={`${step.caption}-${index}`}>{step.caption}</li>
          ),
        )}
      </ol>
    </section>
  );
}

function BuggyView({ template }: { template: ShowTemplate }) {
  const variant = template.buggy[0];
  const steps = presentedSteps(template, variant ?? null);
  const [taps, setTaps] = useState(0);
  const [nudge, setNudge] = useState("");
  const [mode, setMode] = useState<"pick" | "fix" | "guided">("pick");

  if (mode === "guided") return <GuidedView template={template} note="We will walk this one." />;
  if (mode === "fix") return <FixView template={template} />;

  return (
    <section className="show-style card" data-style="buggy">
      <header className="show-style-head">
        <p className="show-style-title">Show me</p>
        <p className="show-style-count">Find the step to fix</p>
      </header>
      <Highlighted prompt={template.prompt} target={template.highlight} />
      <ol className="show-style-steps">
        {steps.map((step, index) => (
          <li key={`${step.caption}-${index}`}>
            <button
              type="button"
              className="show-style-step"
              onClick={() => {
                if (step.wrong) {
                  setMode("fix");
                  return;
                }
                const next = taps + 1;
                setTaps(next);
                if (next >= 2) {
                  setMode("guided");
                  return;
                }
                setNudge("Look near the trade.");
              }}
            >
              {step.caption}
            </button>
          </li>
        ))}
      </ol>
      {nudge ? <p className="hint">{nudge}</p> : null}
    </section>
  );
}

function FixView({ template }: { template: ShowTemplate }) {
  const [entry, setEntry] = useState("");
  const why = whyAfterBuggy(0);
  return (
    <section className="show-style card" data-style="fix">
      <header className="show-style-head">
        <p className="show-style-title">Show me</p>
        <p className="show-style-count">Fix the step</p>
      </header>
      <p className="show-style-caption">Type the answer.</p>
      <label className="show-style-entry">
        <span className="hint">Your answer</span>
        <input className="eval-answer" inputMode="numeric" value={entry} onChange={(event) => setEntry(event.target.value.replace(/\D/g, "").slice(0, 8))} />
      </label>
      <Keypad onDigit={(digit) => setEntry((current) => `${current}${digit}`.slice(0, 8))} onDelete={() => setEntry((current) => current.slice(0, -1))} />
      {why ? <p className="hint">{WHY_WRONG}</p> : null}
    </section>
  );
}

function Highlighted({ prompt, target }: { prompt: string; target: string }) {
  const at = prompt.indexOf(target);
  if (at < 0) return <p className="prompt">{prompt}</p>;
  return (
    <p className="prompt">
      {prompt.slice(0, at)}
      <span className="walk-spot">
        <span className="walk-ring">{prompt.slice(at, at + target.length)}</span>
        <svg className="walk-arrow" viewBox="0 0 64 36" aria-hidden="true">
          <path className="walk-arrow-line" d="M52 30 C 44 29, 38 24, 33 18 S 20 6, 12 5" />
          <path className="walk-arrow-head" d="M12 5 L 20 6 M 12 5 L 13 13" />
        </svg>
      </span>
      {prompt.slice(at + target.length)}
    </p>
  );
}

function Keypad({ onDigit, onDelete }: { onDigit?: (digit: string) => void; onDelete?: () => void }) {
  return (
    <div className="number-pad" aria-label="Number keypad">
      {DIGITS.map((key) =>
        key === "" ? (
          <span key="gap" />
        ) : (
          <button
            key={key}
            type="button"
            data-key={key === "delete" ? "delete" : undefined}
            onClick={() => (key === "delete" ? onDelete?.() : onDigit?.(key))}
          >
            {key === "delete" ? "Delete" : key}
          </button>
        ),
      )}
    </div>
  );
}
