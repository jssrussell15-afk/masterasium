"use client";

import { useState } from "react";
import { ReadAloud } from "@/components/read-aloud";
import { emptyReteachTrace, noteBlock, noteJump, packReteachTrace, type ReteachTrace } from "@/lib/reteach/trace";

export function BaseTenBlocks() {
  const [ones, setOnes] = useState(13);
  const [tens, setTens] = useState(0);
  const [trace, setTrace] = useState<ReteachTrace>(emptyReteachTrace());
  const [spoken, setSpoken] = useState("13 ones. Group 10 ones into a ten.");

  function group() {
    if (ones < 10) return;
    setOnes((current) => current - 10);
    setTens((current) => current + 1);
    setTrace((current) => noteBlock(current, "group", 10));
    setSpoken("10 ones became 1 ten.");
  }

  function ungroup() {
    if (tens < 1) return;
    setTens((current) => current - 1);
    setOnes((current) => current + 10);
    setTrace((current) => noteBlock(current, "ungroup", 10));
    setSpoken("1 ten became 10 ones.");
  }

  return (
    <section className="manipulative card" data-tool="base-ten" aria-label="Base ten blocks">
      <p className="manipulative-title">Base ten blocks</p>
      <div className="speak-row">
        <p className="prompt">Group 10 ones.</p>
        <ReadAloud text="Group 10 ones." label="Speak the question" />
      </div>
      <p className="manipulative-count">
        {tens} {tens === 1 ? "ten" : "tens"} and {ones} ones
      </p>
      <div className="manipulative-row" role="group" aria-label="Ones">
        {Array.from({ length: ones }, (_, index) => (
          <span key={index} className="one-block" aria-hidden="true" />
        ))}
      </div>
      <div className="manipulative-actions">
        <button type="button" onClick={group} disabled={ones < 10}>
          Group 10 ones
        </button>
        <button type="button" onClick={ungroup} disabled={tens < 1}>
          Ungroup a ten
        </button>
        <ReadAloud text={spoken} label="Speak this" />
      </div>
      <TraceField value={packReteachTrace(trace)} />
      <Live text={spoken} />
    </section>
  );
}

export function NumberLine() {
  const [size, setSize] = useState(1);
  const [spot, setSpot] = useState(0);
  const [trace, setTrace] = useState<ReteachTrace>(emptyReteachTrace());
  const [spoken, setSpoken] = useState("A number line from 0 to 20. Jump size is 1.");
  const marks = [0, 5, 10, 15, 20];

  function jump(nextSize = size) {
    const landed = Math.min(20, spot + nextSize);
    setSpot(landed);
    setTrace((current) => noteJump(current, nextSize));
    setSpoken(`Jumped ${nextSize} and landed on ${landed}.`);
  }

  return (
    <section
      className="manipulative card"
      data-tool="number-line"
      aria-label="Number line"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          jump(size);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          const back = Math.max(0, spot - size);
          setSpot(back);
          setSpoken(`Moved back to ${back}.`);
        }
      }}
    >
      <p className="manipulative-title">Number line</p>
      <div className="speak-row">
        <p className="prompt">Tap to jump.</p>
        <ReadAloud text="Tap to jump." label="Speak the question" />
      </div>
      <div className="line-row" role="group" aria-label="Number line marks">
        {marks.map((mark) => (
          <button
            key={mark}
            type="button"
            className={mark === spot ? "line-mark is-here" : "line-mark"}
            aria-current={mark === spot ? "true" : undefined}
            onClick={() => {
              const delta = Math.abs(mark - spot);
              setSpot(mark);
              if (delta > 0) setTrace((current) => noteJump(current, delta));
              setSpoken(`Landed on ${mark}.`);
            }}
          >
            {mark}
          </button>
        ))}
      </div>
      <div className="manipulative-actions" role="group" aria-label="Jump size">
        {[1, 5, 10].map((choice) => (
          <button
            key={choice}
            type="button"
            aria-pressed={size === choice}
            onClick={() => {
              setSize(choice);
              setSpoken(`Jump size is ${choice}.`);
            }}
          >
            Jump {choice}
          </button>
        ))}
        <button type="button" onClick={() => jump()}>
          Jump
        </button>
        <ReadAloud text={spoken} label="Speak this" />
      </div>
      <p className="hint">You are on {spot}.</p>
      <TraceField value={packReteachTrace(trace)} />
      <Live text={spoken} />
    </section>
  );
}

export function FractionBars() {
  const [parts, setParts] = useState(4);
  const [shaded, setShaded] = useState<number[]>([]);
  const [spoken, setSpoken] = useState("A bar in 4 equal parts. Tap a part to shade it.");

  function split(next: number) {
    setParts(next);
    setShaded([]);
    setSpoken(`The bar is split into ${next} equal parts.`);
  }

  function shade(index: number) {
    setShaded((current) => (current.includes(index) ? current.filter((part) => part !== index) : [...current, index]));
    setSpoken(`Part ${index + 1} of ${parts}.`);
  }

  return (
    <section className="manipulative card" data-tool="fraction-bars" aria-label="Fraction bars">
      <p className="manipulative-title">Fraction bars</p>
      <div className="speak-row">
        <p className="prompt">Tap a part to shade it.</p>
        <ReadAloud text="Tap a part to shade it." label="Speak the question" />
      </div>
      <div className="bar-row" role="group" aria-label={`${parts} equal parts`}>
        {Array.from({ length: parts }, (_, index) => {
          const on = shaded.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={on ? "bar-part is-shaded" : "bar-part"}
              aria-pressed={on}
              aria-label={`Part ${index + 1} of ${parts}${on ? ", shaded" : ""}`}
              onClick={() => shade(index)}
            />
          );
        })}
      </div>
      <div className="manipulative-actions">
        <button type="button" onClick={() => split(2)}>
          Split into 2
        </button>
        <button type="button" onClick={() => split(4)}>
          Split into 4
        </button>
        <ReadAloud text={spoken} label="Speak this" />
      </div>
      <p className="hint">{shaded.length} shaded.</p>
      <Live text={spoken} />
    </section>
  );
}

function Live({ text }: { text: string }) {
  return (
    <p className="visually-hidden" role="status" aria-live="polite">
      {text}
    </p>
  );
}

function TraceField({ value }: { value: string }) {
  return <input type="hidden" name="strategy_trace" value={value} readOnly />;
}
