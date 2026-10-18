"use client";

import { useMemo, useState } from "react";
import { asRefs, nextEvalItem, type NextEval } from "@/lib/eval/adapt";
import { EVAL_BANK } from "@/lib/eval/bank";
import { fillEval } from "@/lib/eval/fill";
import { alreadyKnow, placeStrand, startTitles } from "@/lib/eval/place";
import {
  ALREADY_KNOW,
  CHILD_END,
  CHILD_POST_START,
  CHILD_START,
  EVAL_STRANDS,
  type EvalForm,
  type EvalGrade,
  type EvalMark,
  type ServedEval,
} from "@/lib/eval/types";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"] as const;

export function EvalStart({ form }: { form: EvalForm }) {
  const heading = form === "post" ? CHILD_POST_START : CHILD_START;
  return (
    <section className="eval-screen card">
      <h1 className="display text-4xl">{heading}</h1>
      <p className="hint mt-3">Take your time.</p>
      <a className="btn btn-primary mt-6" href={`/preview/eval?scene=run&form=${form}`}>
        Begin
      </a>
    </section>
  );
}

export function EvalEnd({ known, starts }: { known: string[]; starts: string[] }) {
  return (
    <section className="eval-screen card">
      <h1 className="display text-4xl">{CHILD_END}</h1>
      {starts.length > 0 ? (
        <ul className="eval-list mt-4">
          {starts.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      ) : null}
      {known.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold">{ALREADY_KNOW}</h2>
          <ul className="eval-list mt-3">
            {known.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Keypad({ onDigit, onDelete }: { onDigit: (digit: string) => void; onDelete: () => void }) {
  return (
    <div className="number-pad" aria-label="Number keypad">
      {DIGITS.map((key) =>
        key === "" ? (
          <span key="gap" />
        ) : key === "delete" ? (
          <button key={key} type="button" data-key="delete" onClick={onDelete}>
            Delete
          </button>
        ) : (
          <button key={key} type="button" onClick={() => onDigit(key)}>
            {key}
          </button>
        ),
      )}
    </div>
  );
}

export function EvalQuestion({ prompt, answer }: { prompt: string; answer: number }) {
  const [entry, setEntry] = useState("");
  const [note, setNote] = useState("");

  function save(mark: EvalMark) {
    if (mark === "not_learned") {
      setNote("Saved. This one is not learned yet.");
      return;
    }
    if (!entry) {
      setNote("Type an answer first.");
      return;
    }
    void answer;
    setNote("Saved.");
  }

  return (
    <section className="eval-screen question-screen card">
      <p className="prompt">{prompt}</p>
      <label className="eval-entry mt-4">
        <span className="hint">Your answer</span>
        <input
          className="eval-answer"
          inputMode="numeric"
          value={entry}
          onChange={(event) => setEntry(event.target.value.replace(/\D/g, "").slice(0, 8))}
        />
      </label>
      <Keypad
        onDigit={(digit) => setEntry((current) => `${current}${digit}`.slice(0, 8))}
        onDelete={() => setEntry((current) => current.slice(0, -1))}
      />
      <div className="eval-actions">
        <button className="btn btn-primary" type="button" onClick={() => save("correct")}>
          Save
        </button>
        <button className="btn btn-secondary eval-not-learned" type="button" onClick={() => save("not_learned")}>
          I haven&apos;t learned this yet
        </button>
      </div>
      {note ? <p className="hint mt-3">{note}</p> : null}
    </section>
  );
}

export function EvalRun({ grade, form, moveAhead }: { grade: EvalGrade; form: EvalForm; moveAhead: boolean }) {
  const bank = useMemo(() => asRefs(EVAL_BANK), []);
  const [served, setServed] = useState<ServedEval[]>([]);
  const [entry, setEntry] = useState("");
  const [note, setNote] = useState("");
  const next: NextEval | null = nextEvalItem(grade, bank, served);

  if (!next) {
    const placements = EVAL_STRANDS.map((strand) => {
      const core = served.filter((item) => item.strand === strand && item.role === "core");
      return placeStrand({
        grade,
        strand,
        correct: core.filter((item) => item.mark === "correct").length,
        missed: core.filter((item) => item.mark === "missed").length,
        skipped: core.filter((item) => item.mark === "not_learned").length,
        moveAhead,
      });
    });
    return <EvalEnd known={alreadyKnow(grade, placements)} starts={startTitles(placements)} />;
  }

  const template = EVAL_BANK.find((item) => item.id === next.item.id);
  if (!template) return null;
  const filled = fillEval(template, form, 1);

  function commit(mark: EvalMark) {
    setServed((current) =>
      current.concat({
        templateId: next!.item.id,
        strand: next!.item.strand,
        skill: next!.item.skill,
        grade: next!.item.grade,
        role: next!.role,
        mark,
      }),
    );
    setEntry("");
    setNote("");
  }

  return (
    <section className="eval-screen question-screen card">
      <p className="prompt">{filled.prompt}</p>
      <label className="eval-entry mt-4">
        <span className="hint">Your answer</span>
        <input
          className="eval-answer"
          inputMode="numeric"
          value={entry}
          onChange={(event) => setEntry(event.target.value.replace(/\D/g, "").slice(0, 8))}
        />
      </label>
      <Keypad
        onDigit={(digit) => setEntry((current) => `${current}${digit}`.slice(0, 8))}
        onDelete={() => setEntry((current) => current.slice(0, -1))}
      />
      <div className="eval-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            if (!entry) {
              setNote("Type an answer first.");
              return;
            }
            commit(entry === String(filled.answer) ? "correct" : "missed");
          }}
        >
          Save
        </button>
        <button className="btn btn-secondary eval-not-learned" type="button" onClick={() => commit("not_learned")}>
          I haven&apos;t learned this yet
        </button>
      </div>
      {note ? <p className="hint mt-3">{note}</p> : null}
    </section>
  );
}
