"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NumberKeypad } from "@/components/number-keypad";
import { LightbulbIcon } from "@/components/show-me";
import { saveGoFurtherSet } from "@/lib/practice/go-further-actions";
import {
  GO_FURTHER_SIZE,
  checkGoFurther,
  wentFurtherLine,
  type GoFurtherQuestion,
  type GoFurtherResponse,
} from "@/lib/practice/go-further";

export function GoFurtherSession({
  questions,
  startIndex = 0,
  childId,
  backHref = "/practice",
}: {
  questions: GoFurtherQuestion[];
  startIndex?: number;
  childId: string | null;
  backHref?: string;
}) {
  const [index, setIndex] = useState(startIndex);
  const [results, setResults] = useState<boolean[]>([]);
  const question = questions[index];

  if (!question || index >= questions.length) {
    return (
      <div className="question-screen">
        <Finished
          skillId={questions[0]?.skillId ?? ""}
          results={results}
          childId={childId}
          backHref={backHref}
        />
      </div>
    );
  }

  return (
    <div className="question-screen" data-go-further={question.kind}>
      <p className="question-progress">
        Question {index + 1} of {questions.length}
      </p>
      <GoFurtherCard
        key={question.id}
        question={question}
        onNext={(correct) => {
          setResults((current) => [...current, correct]);
          setIndex((current) => current + 1);
        }}
      />
    </div>
  );
}

function Finished({
  skillId,
  results,
  childId,
  backHref,
}: {
  skillId: string;
  results: boolean[];
  childId: string | null;
  backHref: string;
}) {
  const line = wentFurtherLine(skillId) ?? "You went further.";
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!childId || results.length !== GO_FURTHER_SIZE) return;
    let cancel = false;
    saveGoFurtherSet({
      childId,
      skillId,
      asked: results.length,
      correct: results.filter(Boolean).length,
    }).then((saved) => {
      if (!cancel && saved.error) setNote(saved.error);
    });
    return () => {
      cancel = true;
    };
  }, [childId, results, skillId]);

  return (
    <section className="question-card grid gap-3" aria-label="Go further finished">
      <h1 className="prompt prompt-long">{line}</h1>
      {note ? <p className="hint">{note}</p> : null}
      <Link className="btn btn-primary question-submit" href={backHref}>
        Back to practice
      </Link>
    </section>
  );
}

function GoFurtherCard({
  question,
  onNext,
}: {
  question: GoFurtherQuestion;
  onNext: (correct: boolean) => void;
}) {
  const [hintOpen, setHintOpen] = useState(false);
  const [showOpen, setShowOpen] = useState(false);
  const [showStep, setShowStep] = useState(0);
  const [note, setNote] = useState("");
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(false);

  function submit(response: GoFurtherResponse) {
    if (locked) return;
    const result = checkGoFurther(question, response);
    setCorrect(result.correct);
    setNote(result.note);
    setLocked(true);
    setShowOpen(false);
  }

  return (
    <section className={`question-card grid gap-3${showOpen ? " walk-raised" : ""}`}>
      {showOpen ? <div className="walk-dim" /> : null}
      <p className="topic-label">Go further</p>
      <h1 className={question.prompt.length > 80 ? "prompt prompt-long" : "prompt"}>{question.prompt}</h1>
      {hintOpen && !showOpen ? (
        <p className="inline-help">
          <LightbulbIcon />
          <span>{question.hint}</span>
        </p>
      ) : null}
      <p className="visually-hidden" role="status" aria-live="polite">
        {note}
      </p>
      {showOpen ? (
        <ShowSteps
          lines={question.show}
          index={showStep}
          onNext={() => {
            if (showStep >= question.show.length - 1) setShowOpen(false);
            else setShowStep((current) => current + 1);
          }}
          onClose={() => setShowOpen(false)}
        />
      ) : (
        <QuestionBody question={question} locked={locked} onSubmit={submit} />
      )}
      {note && !showOpen ? <p className={correct ? "feedback good" : "feedback warm"}>{note}</p> : null}
      {locked && !showOpen ? (
        <button className="btn btn-primary question-submit" type="button" onClick={() => onNext(correct)}>
          Next
        </button>
      ) : null}
      {locked || showOpen ? null : (
        <div className="help-row">
          <button type="button" className="help-target" onClick={() => setHintOpen(true)}>
            Help me with this
          </button>
          <button
            type="button"
            className="help-target"
            onClick={() => {
              setShowStep(0);
              setShowOpen(true);
              setHintOpen(false);
            }}
          >
            Show me
          </button>
        </div>
      )}
    </section>
  );
}

function QuestionBody({
  question,
  locked,
  onSubmit,
}: {
  question: GoFurtherQuestion;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  if (question.kind === "compare") return <CompareBody question={question} locked={locked} onSubmit={onSubmit} />;
  if (question.kind === "balance") return <BalanceBody question={question} locked={locked} onSubmit={onSubmit} />;
  if (question.kind === "true-false") return <TrueFalseBody question={question} locked={locked} onSubmit={onSubmit} />;
  if (question.kind === "many-ways") return <ManyWaysBody question={question} locked={locked} onSubmit={onSubmit} />;
  if (question.kind === "bar") return <BarBody question={question} locked={locked} onSubmit={onSubmit} />;
  return <PatternBody question={question} locked={locked} onSubmit={onSubmit} />;
}

function CompareBody({
  question,
  locked,
  onSubmit,
}: {
  question: Extract<GoFurtherQuestion, { kind: "compare" }>;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  const [side, setSide] = useState<"left" | "right" | "">("");
  const [reasonId, setReasonId] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (side !== "left" && side !== "right") return;
        if (!reasonId) return;
        onSubmit({ kind: "compare", side, reasonId });
      }}
    >
      <div className="go-choices" role="group" aria-label="Which is bigger?">
        <Choice pressed={side === "left"} disabled={locked} onClick={() => setSide("left")}>
          {question.left}
        </Choice>
        <Choice pressed={side === "right"} disabled={locked} onClick={() => setSide("right")}>
          {question.right}
        </Choice>
      </div>
      <div className="go-choices" role="group" aria-label="Reason">
        {question.reasons.map((reason) => (
          <Choice key={reason.id} pressed={reasonId === reason.id} disabled={locked} onClick={() => setReasonId(reason.id)}>
            {reason.text}
          </Choice>
        ))}
      </div>
      <Check disabled={locked || side === "" || reasonId === ""} />
    </form>
  );
}

function BalanceBody({
  question,
  locked,
  onSubmit,
}: {
  question: Extract<GoFurtherQuestion, { kind: "balance" }>;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <AnswerForm
      value={value}
      setValue={setValue}
      locked={locked}
      fraction={question.fraction}
      label="Missing number"
      onSubmit={() => onSubmit({ kind: "balance", value })}
    />
  );
}

function TrueFalseBody({
  question,
  locked,
  onSubmit,
}: {
  question: Extract<GoFurtherQuestion, { kind: "true-false" }>;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  const [verdict, setVerdict] = useState<boolean | null>(null);
  const [reasonId, setReasonId] = useState("");
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (verdict === null || !reasonId) return;
        onSubmit({ kind: "true-false", verdict, reasonId });
      }}
    >
      <div className="go-choices" role="group" aria-label="True or false">
        <Choice pressed={verdict === true} disabled={locked} onClick={() => setVerdict(true)}>
          True
        </Choice>
        <Choice pressed={verdict === false} disabled={locked} onClick={() => setVerdict(false)}>
          False
        </Choice>
      </div>
      <div className="go-choices" role="group" aria-label="Reason">
        {question.reasons.map((reason) => (
          <Choice key={reason.id} pressed={reasonId === reason.id} disabled={locked} onClick={() => setReasonId(reason.id)}>
            {reason.text}
          </Choice>
        ))}
      </div>
      <Check disabled={locked || verdict === null || reasonId === ""} />
    </form>
  );
}

function ManyWaysBody({
  question,
  locked,
  onSubmit,
}: {
  question: Extract<GoFurtherQuestion, { kind: "many-ways" }>;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  function toggle(id: string) {
    setPicked((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= question.need) return current;
      return [...current, id];
    });
  }
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (picked.length !== question.need) return;
        onSubmit({ kind: "many-ways", cardIds: picked });
      }}
    >
      <div className="go-choices" role="group" aria-label="Ways">
        {question.cards.map((item) => (
          <Choice key={item.id} pressed={picked.includes(item.id)} disabled={locked} onClick={() => toggle(item.id)}>
            {item.text}
          </Choice>
        ))}
      </div>
      <Check disabled={locked || picked.length !== question.need} />
    </form>
  );
}

function BarBody({
  question,
  locked,
  onSubmit,
}: {
  question: Extract<GoFurtherQuestion, { kind: "bar" }>;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  const [slots, setSlots] = useState({ partA: "", partB: "", whole: "" });
  const [selected, setSelected] = useState<string | null>(null);
  const [value, setValue] = useState("");

  function place(slot: "partA" | "partB" | "whole", chip: string) {
    if (locked) return;
    setSlots((current) => {
      const next = { ...current };
      (["partA", "partB", "whole"] as const).forEach((key) => {
        if (next[key] === chip) next[key] = "";
      });
      next[slot] = chip;
      return next;
    });
    setSelected(null);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!slots.partA || !slots.partB || !slots.whole || !value.trim()) return;
        onSubmit({ kind: "bar", ...slots, value });
      }}
    >
      <div className="bar-model" aria-label="Part part whole">
        <Slot
          label="Whole"
          value={slots.whole}
          disabled={locked}
          onPlace={(chip) => place("whole", chip)}
          onTap={() => {
            if (selected) place("whole", selected);
          }}
        />
        <div className="bar-parts">
          <Slot
            label="Part"
            value={slots.partA}
            disabled={locked}
            onPlace={(chip) => place("partA", chip)}
            onTap={() => {
              if (selected) place("partA", selected);
            }}
          />
          <Slot
            label="Part"
            value={slots.partB}
            disabled={locked}
            onPlace={(chip) => place("partB", chip)}
            onTap={() => {
              if (selected) place("partB", selected);
            }}
          />
        </div>
      </div>
      <div className="bar-chips" role="group" aria-label="Numbers">
        {question.chips.map((chip) => (
          <button
            key={chip}
            type="button"
            className="bar-chip"
            draggable={!locked}
            aria-pressed={selected === chip}
            disabled={locked}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", chip);
              setSelected(chip);
            }}
            onClick={() => setSelected((current) => (current === chip ? null : chip))}
          >
            {chip}
          </button>
        ))}
      </div>
      <p className="hint">Tap a number, then tap a part or the whole. You can also drag it.</p>
      <label className="grid gap-2">
        <span className="hint">Your answer</span>
        <input
          className="answer-input"
          inputMode="numeric"
          value={value}
          disabled={locked}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <NumberKeypad
        disabled={locked}
        onDigit={(digit) => setValue((current) => `${current}${digit}`.slice(0, 12))}
        onDelete={() => setValue((current) => current.slice(0, -1))}
      />
      <Check disabled={locked || !slots.partA || !slots.partB || !slots.whole || value.trim() === ""} />
    </form>
  );
}

function PatternBody({
  question,
  locked,
  onSubmit,
}: {
  question: Extract<GoFurtherQuestion, { kind: "pattern" }>;
  locked: boolean;
  onSubmit: (response: GoFurtherResponse) => void;
}) {
  const [value, setValue] = useState("");
  return (
    <AnswerForm
      value={value}
      setValue={setValue}
      locked={locked}
      fraction={question.fraction}
      label="Your answer"
      onSubmit={() => onSubmit({ kind: "pattern", value })}
    />
  );
}

function AnswerForm({
  value,
  setValue,
  locked,
  fraction,
  label,
  onSubmit,
}: {
  value: string;
  setValue: (value: string) => void;
  locked: boolean;
  fraction: boolean;
  label: string;
  onSubmit: () => void;
}) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!value.trim()) return;
        onSubmit();
      }}
    >
      <label className="grid gap-2">
        <span className="hint">{label}</span>
        <input
          className="answer-input"
          inputMode={fraction ? "text" : "numeric"}
          value={value}
          disabled={locked}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <NumberKeypad
        disabled={locked}
        extras={fraction ? ["/"] : []}
        onDigit={(digit) => setValue(`${value}${digit}`.slice(0, 16))}
        onDelete={() => setValue(value.slice(0, -1))}
      />
      <Check disabled={locked || value.trim() === ""} />
    </form>
  );
}

function Slot({
  label,
  value,
  disabled,
  onPlace,
  onTap,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onPlace: (chip: string) => void;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      className="bar-slot"
      disabled={disabled}
      aria-label={value ? `${label} ${value}` : label}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const chip = event.dataTransfer.getData("text/plain");
        if (chip) onPlace(chip);
      }}
      onClick={onTap}
    >
      <span className="bar-slot-label">{label}</span>
      <span className="bar-slot-value">{value || " "}</span>
    </button>
  );
}

function Choice({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button type="button" className="go-choice" aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

function Check({ disabled }: { disabled: boolean }) {
  return (
    <button className="btn btn-primary question-submit" type="submit" disabled={disabled}>
      Check
    </button>
  );
}

function ShowSteps({
  lines,
  index,
  onNext,
  onClose,
}: {
  lines: string[];
  index: number;
  onNext: () => void;
  onClose: () => void;
}) {
  const caption = lines[index] ?? "";
  const canSpeak = useCanSpeak();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Enter" || event.repeat) return;
      event.preventDefault();
      onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext]);

  return (
    <aside className="show-me" aria-label="Show me">
      <div className="show-me-head">
        <svg className="show-me-path" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 17c3.5-1 4-6 8-6s4.2 5 7 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <circle cx="5.5" cy="17" r="1.5" fill="currentColor" />
          <circle cx="20" cy="15" r="1.5" fill="currentColor" />
        </svg>
        <p className="show-me-title">Show me</p>
        <span className="show-me-count">
          Step {index + 1} of {lines.length}
        </span>
        {canSpeak ? (
          <button type="button" className="show-me-speak" aria-label="Read this step" onClick={() => speak(caption)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 10h3l4-3v10l-4-3H4z" fill="currentColor" />
              <path d="M15 9.5a3.5 3.5 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>
      <p className="show-me-caption">{caption}</p>
      <button className="btn btn-primary show-me-next" type="button" onClick={onNext}>
        {index >= lines.length - 1 ? "Back to the question" : "Next step"}
      </button>
    </aside>
  );
}

function useCanSpeak(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  return ready;
}

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}
