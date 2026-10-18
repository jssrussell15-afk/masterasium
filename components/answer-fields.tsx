"use client";

import { useState, type Ref } from "react";
import type { AnswerShape, PartField } from "@/lib/practice/parts";

const single: PartField = { name: "answer", label: "Answer", inputMode: "decimal" };

/** One box for a single answer. Extra boxes only when the shape asks for them. */
export function AnswerFields({
  shape,
  values,
  onChange,
  disabled = false,
  readOnly = false,
  inputRef,
  onFocusField,
}: {
  shape: AnswerShape;
  values?: Record<string, string>;
  onChange?: (name: string, value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  onFocusField?: (name: string) => void;
}) {
  const parts = shape.kind === "parts" ? shape.parts : [fieldFor(shape)];
  const [local, setLocal] = useState<Record<string, string>>({});
  const current = values ?? local;

  return (
    <div className={shape.kind === "parts" ? "answer-parts" : undefined}>
      {parts.map((part, index) => (
        <label className="field" key={part.name}>
          {part.label}
          <input
            ref={index === 0 ? inputRef : undefined}
            className="answer-input"
            name={part.name}
            inputMode={part.inputMode}
            autoComplete="off"
            enterKeyHint={readOnly ? "next" : "done"}
            required={!readOnly && !disabled}
            autoFocus={index === 0 && !readOnly}
            disabled={disabled}
            readOnly={readOnly}
            value={current[part.name] ?? ""}
            onFocus={() => onFocusField?.(part.name)}
            onChange={(event) => {
              const next = event.target.value;
              if (onChange) onChange(part.name, next);
              else setLocal((now) => ({ ...now, [part.name]: next }));
            }}
          />
        </label>
      ))}
    </div>
  );
}

function fieldFor(shape: Extract<AnswerShape, { kind: "single" }>): PartField {
  return { ...single, inputMode: shape.inputMode ?? "decimal" };
}

export function answerUsesKeypad(shape: AnswerShape): boolean {
  const modes =
    shape.kind === "parts" ? shape.parts.map((part) => part.inputMode) : [shape.inputMode ?? "decimal"];
  return modes.some((mode) => mode === "numeric" || mode === "decimal");
}
