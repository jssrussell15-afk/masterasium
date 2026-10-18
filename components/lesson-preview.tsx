import { AssistedPrompt } from "@/components/assisted-prompt";
import { QuestionCard } from "@/components/question-card";

/**
 * A still frame of the Grade 3 lesson, built from the same pieces as practice.
 * The controls are inert so this preview is not a second, fake practice session.
 */
export function LessonPreview() {
  return (
    <figure className="card lesson-preview">
      <figcaption className="eyebrow">Grade 3 lesson · Ontario</figcaption>
      <div inert>
        <QuestionCard
          heading="h2"
          eyebrow="Focus · Multiplication facts to 10×10"
          prompt="6 × 7 = ?"
          responseHint={null}
        >
          <AssistedPrompt
            assist={{
              setup: "6 groups of 7 is 6 × 7.",
              firstStep: "Count by sevens.",
            }}
          />
          <div className="question-form">
            <label className="field">
              Answer
              <input className="answer-input" readOnly value="" tabIndex={-1} />
            </label>
            <span className="btn btn-primary">Check</span>
          </div>
        </QuestionCard>
        <div className="hint-dock">
          <div className="hint-actions">
            <span className="hint-target">Give me a hint</span>
            <span className="hint-target">Show me an example</span>
            <span className="hint-target">I give up</span>
          </div>
        </div>
      </div>
    </figure>
  );
}
