"use client";

import { useState } from "react";

/** Notes beside the question. Nothing typed here is submitted as the answer. */
export function Scratchpad() {
  const [open, setOpen] = useState(false);

  return (
    <aside className="scratchpad" aria-label="Scratchpad">
      <button
        type="button"
        className="btn btn-quiet scratchpad-toggle"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide notes" : "Notes"}
      </button>
      {open ? (
        <textarea
          className="scratchpad-input"
          aria-label="Notes"
          rows={3}
          placeholder="Notes stay on this screen."
        />
      ) : null}
    </aside>
  );
}
