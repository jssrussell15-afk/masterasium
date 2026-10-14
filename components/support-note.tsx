import type { QuestionKind } from "@/lib/practice/types";

export function SupportNote({ kind }: { kind: QuestionKind }) {
  if (kind !== "support") return null;
  return <p className="hint">A few easier questions, then back to the skill.</p>;
}
