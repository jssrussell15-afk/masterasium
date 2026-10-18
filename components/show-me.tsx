"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NumberKeypad } from "@/components/number-keypad";
import type { WalkStep, WalkVisual } from "@/lib/practice/walk";
import { targetSpan } from "@/lib/practice/walk";

export function HighlightedPrompt({
  prompt,
  target,
  occurrence = 0,
}: {
  prompt: string;
  target: string | null;
  occurrence?: number;
}) {
  if (!target) return prompt;
  const span = targetSpan(prompt, target, occurrence);
  if (!span) return prompt;
  return (
    <>
      {prompt.slice(0, span.start)}
      <span className="walk-spot">
        <span className="walk-ring" data-walk-target={target}>
          {span.text}
        </span>
        <WalkArrow />
      </span>
      {prompt.slice(span.end)}
    </>
  );
}

export function ShowMePanel({
  step,
  index,
  total,
  handoff,
  draft,
  miss,
  pending,
  showKeypad,
  extraKey,
  onDraft,
  onDigit,
  onDelete,
  onNext,
  onClose,
  action,
  fields,
  handoffIntent,
  onElapsed,
}: {
  step: WalkStep;
  index: number;
  total: number;
  handoff: boolean;
  draft: string;
  miss: boolean;
  pending: boolean;
  showKeypad: boolean;
  extraKey: string | null;
  onDraft: (value: string) => void;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onNext: () => void;
  onClose: () => void;
  action?: (formData: FormData) => void;
  fields: { name: string; value: string }[];
  handoffIntent: string;
  onElapsed?: (form: HTMLFormElement) => void;
}) {
  const canSpeak = useCanSpeak();
  const caption = handoff ? "Your turn: try one like it" : step.caption;
  const last = index === total - 1;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Enter" || event.repeat) return;
      event.preventDefault();
      if (handoff) {
        const form = document.getElementById("show-me-handoff");
        if (form instanceof HTMLFormElement) form.requestSubmit();
        return;
      }
      onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handoff, onClose, onNext]);

  function stamp(event: FormEvent<HTMLFormElement>) {
    onElapsed?.(event.currentTarget);
  }

  const nextButton = (
    <button className="btn btn-primary show-me-next" type={handoff && action ? "submit" : "button"} disabled={pending} onClick={handoff ? undefined : onNext}>
      {pending ? "One moment…" : "Next step"}
    </button>
  );

  return (
    <aside className="show-me" aria-label="Show me">
      <div className="show-me-head">
        <PathIcon />
        <p className="show-me-title">Show me</p>
        {handoff ? <span className="show-me-count">Your turn</span> : <span className="show-me-count">Step {index + 1} of {total}</span>}
        {canSpeak ? (
          <button type="button" className="show-me-speak" aria-label="Read this step" onClick={() => speak(caption)}>
            <SpeakerIcon />
          </button>
        ) : null}
      </div>
      <p className="show-me-caption" aria-live="polite">
        {caption}
      </p>
      <div className="show-me-stage">
        {handoff ? null : step.visual ? <WalkVisualView visual={step.visual} /> : null}
        {!handoff && last ? (
          <label className="field show-me-answer">
            Answer
            <input
              className="answer-input"
              value={draft}
              inputMode={extraKey ? "text" : "numeric"}
              autoComplete="off"
              aria-invalid={miss || undefined}
              onChange={(event) => onDraft(event.target.value)}
            />
          </label>
        ) : null}
        {!handoff && last && miss ? <p className="show-me-miss">Look once more.</p> : null}
        {!handoff && last && showKeypad ? (
          <NumberKeypad disabled={pending} onDigit={onDigit} onDelete={onDelete} extras={extraKey ? [extraKey] : []} />
        ) : null}
      </div>
      {handoff ? (
        <form id="show-me-handoff" action={action} onSubmit={stamp}>
          {fields.map((field) => (
            <input key={field.name} type="hidden" name={field.name} value={field.value} />
          ))}
          <input type="hidden" name="intent" value={handoffIntent} />
          {nextButton}
        </form>
      ) : (
        nextButton
      )}
    </aside>
  );
}

function useCanSpeak(): boolean {
  const [canSpeak, setCanSpeak] = useState(false);
  useEffect(() => {
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  return canSpeak;
}

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

function PathIcon() {
  return (
    <svg className="show-me-path" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 17c3.5-1 4-6 8-6s4.2 5 7 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="5.5" cy="17" r="1.5" fill="currentColor" />
      <circle cx="20" cy="15" r="1.5" fill="currentColor" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 10h3l4-3v10l-4-3H4z" fill="currentColor" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WalkArrow() {
  return (
    <svg className="walk-arrow" viewBox="0 0 64 36" aria-hidden="true">
      <path className="walk-arrow-line" d="M52 30 C 44 29, 38 24, 33 18 S 20 6, 12 5" pathLength={100} />
      <path className="walk-arrow-head" d="M12 5 L 20 6 M 12 5 L 13 13" pathLength={24} />
    </svg>
  );
}

function WalkVisualView({ visual }: { visual: WalkVisual }) {
  if (visual.kind === "base-ten") return <BaseTen visual={visual} />;
  if (visual.kind === "groups") return <Groups visual={visual} />;
  if (visual.kind === "array") return <ArrayDots visual={visual} />;
  if (visual.kind === "number-line") return <NumberLine visual={visual} />;
  return <Clock visual={visual} />;
}

function BaseTen({ visual }: { visual: Extract<WalkVisual, { kind: "base-ten" }> }) {
  const focus = visual.focus ?? "ones";
  const dim = (place: string) => (focus === "trade" || focus === place ? "" : " dim");
  const flats = Math.min(9, Math.max(0, visual.hundreds));
  const rods = Math.min(9, Math.max(0, visual.tens));
  const ones = Math.min(18, Math.max(0, visual.ones));
  return (
    <svg className="walk-visual" viewBox="0 0 280 96" role="img" aria-label="Base ten blocks">
      {Array.from({ length: flats }, (_, index) => (
        <rect key={`h${index}`} className={`block hundred${dim("hundreds")}`} x={8 + (index % 5) * 26} y={8 + Math.floor(index / 5) * 24} width="22" height="20" rx="2" />
      ))}
      {Array.from({ length: rods }, (_, index) => (
        <rect key={`t${index}`} className={`block ten${dim("tens")}`} x={148 + index * 10} y={8} width="7" height="40" rx="2" />
      ))}
      {Array.from({ length: ones }, (_, index) => (
        <rect key={`o${index}`} className={`block one${dim("ones")}`} x={148 + (index % 9) * 12} y={56 + Math.floor(index / 9) * 14} width="9" height="9" rx="1.5" />
      ))}
      {focus === "trade" ? <path className="trade-arrow" d="M150 78 C 170 70, 190 40, 210 22" pathLength={100} /> : null}
    </svg>
  );
}

function Groups({ visual }: { visual: Extract<WalkVisual, { kind: "groups" }> }) {
  const groups = Math.min(10, Math.max(0, visual.groups));
  const each = Math.min(12, Math.max(0, visual.each));
  return (
    <svg className="walk-visual" viewBox="0 0 280 96" role="img" aria-label="Equal groups">
      {Array.from({ length: groups }, (_, group) => {
        const x = 18 + (group % 5) * 54;
        const y = group < 5 ? 28 : 72;
        return (
          <g key={group}>
            <circle className="group-ring" cx={x} cy={y} r="20" />
            {each <= 6
              ? Array.from({ length: each }, (_, dot) => (
                  <circle key={dot} className="dot" cx={x - 10 + (dot % 3) * 10} cy={y - 6 + Math.floor(dot / 3) * 10} r="3" />
                ))
              : (
                <text className="group-count" x={x} y={y + 4} textAnchor="middle">
                  {each}
                </text>
              )}
          </g>
        );
      })}
    </svg>
  );
}

function ArrayDots({ visual }: { visual: Extract<WalkVisual, { kind: "array" }> }) {
  const rows = Math.min(10, Math.max(1, visual.rows));
  const columns = Math.min(10, Math.max(1, visual.columns));
  const size = Math.min(16, Math.floor(240 / columns) - 2, Math.floor(80 / rows) - 2);
  return (
    <svg className="walk-visual" viewBox="0 0 280 96" role="img" aria-label="Array">
      {Array.from({ length: rows * columns }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        return <circle key={index} className="dot" cx={20 + column * (size + 4)} cy={14 + row * (size + 4)} r={Math.max(3, size / 3)} />;
      })}
    </svg>
  );
}

function NumberLine({ visual }: { visual: Extract<WalkVisual, { kind: "number-line" }> }) {
  const parts = Math.min(12, Math.max(2, visual.parts));
  const shaded = Math.min(parts, Math.max(0, visual.shaded));
  const left = 24;
  const right = 256;
  const width = right - left;
  const y = 58;
  const hops = visual.hops ? Array.from({ length: shaded }, (_, index) => index) : [];
  return (
    <svg className="walk-visual" viewBox="0 0 280 96" role="img" aria-label="Number line">
      <line className="line-axis" x1={left} y1={y} x2={right} y2={y} />
      {Array.from({ length: parts + 1 }, (_, index) => {
        const x = left + (width * index) / parts;
        return <line key={index} className="line-tick" x1={x} y1={y - 8} x2={x} y2={y + 8} />;
      })}
      {hops.map((index) => {
        const x1 = left + (width * index) / parts;
        const x2 = left + (width * (index + 1)) / parts;
        const mid = (x1 + x2) / 2;
        return <path key={index} className="line-hop" d={`M ${x1} ${y} Q ${mid} ${y - 28} ${x2} ${y}`} pathLength={100} />;
      })}
      <circle className="line-point" cx={left + (width * shaded) / parts} cy={y} r="5" />
    </svg>
  );
}

function Clock({ visual }: { visual: Extract<WalkVisual, { kind: "clock" }> }) {
  const hour = ((visual.hour % 12) + 12) % 12;
  const minute = ((visual.minute % 60) + 60) % 60;
  const minuteAngle = minute * 6 - 90;
  const hourAngle = hour * 30 + minute * 0.5 - 90;
  return (
    <svg className="walk-visual" viewBox="0 0 120 120" role="img" aria-label="Analog clock">
      <circle className="clock-face" cx="60" cy="60" r="46" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = (index * 30 - 90) * (Math.PI / 180);
        return <line key={index} className="clock-tick" x1={60 + Math.cos(angle) * 38} y1={60 + Math.sin(angle) * 38} x2={60 + Math.cos(angle) * 44} y2={60 + Math.sin(angle) * 44} />;
      })}
      <line className={`clock-hand hour${visual.focus === "hour" ? " focus" : ""}`} x1="60" y1="60" x2={handX(hourAngle, 24)} y2={handY(hourAngle, 24)} />
      <line className={`clock-hand minute${visual.focus === "minute" ? " focus" : ""}`} x1="60" y1="60" x2={handX(minuteAngle, 36)} y2={handY(minuteAngle, 36)} />
      <circle className="clock-pin" cx="60" cy="60" r="3" />
    </svg>
  );
}

function handX(angle: number, length: number): number {
  return 60 + Math.cos((angle * Math.PI) / 180) * length;
}

function handY(angle: number, length: number): number {
  return 60 + Math.sin((angle * Math.PI) / 180) * length;
}

export function LightbulbIcon(): ReactNode {
  return (
    <svg className="hint-bulb" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18h6M10 21h4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 14a5 5 0 1 1 8 0c-.8.8-1.5 1.6-1.7 2.6H9.7C9.5 15.6 8.8 14.8 8 14z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
