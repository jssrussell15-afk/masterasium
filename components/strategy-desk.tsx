import { STRATEGY_HEADING } from "@/lib/strategy/copy";
import type { StrandLine } from "@/lib/strategy/desk";

export function StrategyDesk({ lines }: { lines: readonly StrandLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="strategy-desk" aria-label={STRATEGY_HEADING}>
      <h3 className="text-lg font-semibold">{STRATEGY_HEADING}</h3>
      <ul className="strategy-lines">
        {lines.map((line) => (
          <li key={line.strand}>
            <p className="hint">
              <span className="strategy-strand">{line.label}.</span> {line.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
