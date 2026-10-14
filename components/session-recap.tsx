"use client";

import { useState } from "react";

export function SessionRecap({ recap }: { recap: string | null }) {
  const [open, setOpen] = useState(false);
  if (!recap) return null;
  if (!open) {
    return (
      <button type="button" className="btn btn-quiet w-fit" onClick={() => setOpen(true)}>
        Done for today
      </button>
    );
  }
  return (
    <section className="session-recap" role="status">
      <p>{recap}</p>
    </section>
  );
}
