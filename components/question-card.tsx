import type { ReactNode } from "react";

export function QuestionCard({
  eyebrow,
  prompt,
  responseHint,
  aside,
  children,
  heading = "h1",
}: {
  eyebrow: string;
  prompt: string;
  responseHint: string | null;
  aside?: ReactNode;
  children: ReactNode;
  /** Landing previews use h2 so the page keeps a single h1. Practice stays on h1. */
  heading?: "h1" | "h2";
}) {
  const Title = heading === "h2" ? "h2" : "h1";
  return (
    <div className={aside ? "question-layout with-pad" : "question-layout"}>
      <section className="question-card" aria-label="Question">
        <p className="eyebrow">{eyebrow}</p>
        <Title className={prompt.length > 60 ? "prompt prompt-long" : "prompt"}>{prompt}</Title>
        {responseHint ? <p className="hint">{responseHint}</p> : null}
        {children}
      </section>
      {aside}
    </div>
  );
}
