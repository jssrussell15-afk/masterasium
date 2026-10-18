import type { StrandDelta } from "@/lib/eval/place";

export function EvalMap({
  rows,
  prompt,
}: {
  rows: { label: string; level: string }[];
  prompt?: string | null;
}) {
  return (
    <section className="eval-parent card">
      <h1 className="display text-3xl">Skill map</h1>
      {prompt ? <p className="hint mt-3">{prompt}</p> : null}
      <ul className="eval-map mt-4">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <span>{row.level}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EvalDelta({ rows, note }: { rows: StrandDelta[]; note?: string | null }) {
  return (
    <section className="eval-parent card">
      <h1 className="display text-3xl">How this has changed</h1>
      {note ? <p className="hint mt-3">{note}</p> : null}
      <div className="eval-deltas mt-4">
        {rows.map((row) => (
          <article key={row.label}>
            <p>{row.text}</p>
            <div className="eval-bars">
              <p className="hint">At the start</p>
              <div className="eval-track" aria-hidden="true">
                <span className="eval-before" style={{ width: `${row.before}%` }} />
              </div>
              <p className="hint">Now</p>
              <div className="eval-track" aria-hidden="true">
                <span className="eval-after" style={{ width: `${row.after}%` }} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
