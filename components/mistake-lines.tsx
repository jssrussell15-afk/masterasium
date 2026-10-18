"use client";

import { useState } from "react";

export function MistakeLines({ lines }: { lines: string[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <div className="mistake-lines">
      {lines.map((line, index) => {
        const selected = picked === index;
        return (
          <button
            key={line}
            className="mistake-line"
            type="button"
            aria-pressed={selected}
            onClick={() => setPicked(index)}
          >
            <span>{selected ? `Line ${index + 1} selected` : `Line ${index + 1}`}</span>
            {line}
          </button>
        );
      })}
    </div>
  );
}
