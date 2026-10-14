import type { QuestionKind } from "@/lib/practice/types";

export function LessonCheckNote({ kind }: { kind: QuestionKind }) {
  if (kind !== "check") return null;
  return (
    <p className="check-note">
      Show what you know. A few questions confirm this skill before the next one opens.
    </p>
  );
}
