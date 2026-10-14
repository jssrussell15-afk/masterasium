import type { AssistView } from "@/lib/practice/types";

export function AssistedPrompt({ assist }: { assist: AssistView | null }) {
  if (!assist) return null;
  return (
    <section className="assist" aria-label="Guided start">
      <p>{assist.setup}</p>
      {assist.firstStep ? <p>First step: {assist.firstStep}</p> : null}
      <p className="hint">You finish it from here.</p>
    </section>
  );
}
