import type { ReactNode } from "react";

export function QuestionCard({
  eyebrow,
  prompt,
  responseHint,
  aside,
  children,
}: {
  eyebrow: string;
  prompt: string;
  responseHint: string | null;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={aside ? "question-layout with-pad" : "question-layout"}>
      <section className="question-card" aria-label="Question">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className={prompt.length > 60 ? "prompt prompt-long" : "prompt"}>{prompt}</h1>
        {responseHint ? <p className="hint">{responseHint}</p> : null}
        {children}
      </section>
      {aside}
    </div>
  );
}
