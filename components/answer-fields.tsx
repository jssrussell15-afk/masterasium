"use client";

import { useState } from "react";
import type { AnswerShape, PartField } from "@/lib/practice/parts";

const single: PartField = { name: "answer", label: "Answer", inputMode: "decimal" };

/** Controlled fields. One box for a single answer. Extra boxes only when the shape asks for them. */
export function AnswerFields({ shape }: { shape: AnswerShape }) {
  const parts = shape.kind === "parts" ? shape.parts : [single];
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <div className={shape.kind === "parts" ? "answer-parts" : undefined}>
      {parts.map((part, index) => (
        <label className="field" key={part.name}>
          {part.label}
          <input
            className="answer-input"
            name={part.name}
            inputMode={part.inputMode}
            autoComplete="off"
            enterKeyHint="done"
            required
            autoFocus={index === 0}
            value={values[part.name] ?? ""}
            onChange={(event) =>
              setValues((current) => ({ ...current, [part.name]: event.target.value }))
            }
          />
        </label>
      ))}
    </div>
  );
}
