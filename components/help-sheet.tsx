"use client";

import { HighlightedWords, ListenButton, useSpoken } from "@/components/listen";
import { clipKidLine } from "@/lib/practice/fade";

export function HelpSheet({
  steps,
  stepIndex,
  linePrompt = "",
  kicker = null,
  relatedPrompt = null,
  autoRead = false,
  onBack,
  onNext,
  onClose,
}: {
  steps: string[];
  stepIndex: number;
  /** The question these steps explain. The number line reads it. */
  linePrompt?: string;
  /** Set when these steps belong to a different item. */
  kicker?: string | null;
  relatedPrompt?: string | null;
  autoRead?: boolean;
  onBack: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const total = Math.max(steps.length, 1);
  const index = Math.min(Math.max(stepIndex, 0), total - 1);
  const step = clipKidLine(steps[index] ?? "Read the question once more.");
  const last = index >= total - 1;
  const speech = useSpoken(step, { auto: autoRead, rate: autoRead ? 0.85 : undefined });
  const showLine = /just (?:after|before)\s+\d+/i.test(linePrompt);

  return (
    <aside className="help-sheet" role="dialog" aria-label={kicker ?? "Help with this question"}>
      {kicker ? <p className="help-sheet-kicker">{kicker}</p> : null}
      {relatedPrompt ? <p className="example-prompt">{relatedPrompt}</p> : null}
      <div className="help-sheet-top">
        <ListenButton iconOnly speaking={speech.speaking} onClick={speech.toggle} />
        <p className="show-me-caption" aria-live="polite">
          <HighlightedWords text={step} activeWord={speech.activeWord} />
        </p>
        <span className="show-me-count">
          Step {index + 1} of {total}
        </span>
      </div>
      {showLine ? <CountingLine prompt={linePrompt} reveal={last} /> : null}
      <div className="help-sheet-actions">
        <button type="button" className="show-me-back" onClick={onBack} disabled={index === 0}>
          Back
        </button>
        <button type="button" className="btn btn-primary show-me-next" onClick={onNext} disabled={last}>
          Next
        </button>
        <button type="button" className="help-sheet-return" onClick={onClose}>
          Back to my question
        </button>
      </div>
    </aside>
  );
}

function CountingLine({ prompt, reveal }: { prompt: string; reveal: boolean }) {
  const after = prompt.match(/just after\s+(\d+)/i);
  const before = prompt.match(/just before\s+(\d+)/i);
  const start = after ? Number(after[1]) : before ? Number(before[1]) : null;
  if (start == null || !Number.isInteger(start)) return null;
  const direction = after ? 1 : -1;
  const end = start + direction;
  if (end < 0 || end > 20 || start > 20) return null;
  const max = start <= 10 && end <= 10 ? 10 : 20;
  const left = 12;
  const right = 308;
  const width = right - left;
  const y = 16;
  const xAt = (value: number) => left + (width * value) / max;
  const hop = reveal
    ? `M ${xAt(start)} ${y} Q ${(xAt(start) + xAt(end)) / 2} ${y - 12} ${xAt(end)} ${y}`
    : null;

  return (
    <svg className="help-number-line" viewBox="0 0 320 40" role="img" aria-label="Number line">
      <line className="line-axis" x1={left} y1={y} x2={right} y2={y} />
      {Array.from({ length: max + 1 }, (_, value) => {
        const x = xAt(value);
        const marked = value === start || (reveal && value === end);
        return (
          <g key={value}>
            <line className="line-tick" x1={x} y1={y - 4} x2={x} y2={y + 4} />
            <text className={marked ? "line-label marked" : "line-label"} x={x} y={y + 14} textAnchor="middle">
              {value}
            </text>
          </g>
        );
      })}
      <circle className="line-point" cx={xAt(start)} cy={y} r="3.5" />
      {hop ? <path className="line-hop" d={hop} pathLength={100} /> : null}
      {reveal ? <circle className="line-point line-point-end" cx={xAt(end)} cy={y} r="3.5" /> : null}
    </svg>
  );
}
