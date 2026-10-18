import { MistakeLines } from "@/components/mistake-lines";
import { DIFFICULTY_LABEL, type ContentItem } from "@/lib/content/model";

const KIND_LABEL: Record<string, string> = {
  open: "Open",
  bar: "Bar diagram",
  estimate: "Estimate first",
  explanation: "Explain your reasoning",
  mistake: "Find the mistake",
  logic: "Logic puzzle",
  numeric: "Puzzle",
};

export function Phase1Card({
  item,
  skillLabel,
  topic,
}: {
  item: ContentItem;
  skillLabel: string;
  topic: string;
}) {
  const { template } = item;
  const parts = ["p0", "p1", "p2"]
    .map((key) => template.slots[key])
    .filter((value): value is number => typeof value === "number" && value > 0);
  return (
    <article className="phase-card" data-phase-kind={item.questionType}>
      <p className="eyebrow">{KIND_LABEL[item.questionType] ?? item.questionType}</p>
      <h1 className="display text-3xl">{skillLabel}</h1>
      <p className="hint">
        {topic} · {DIFFICULTY_LABEL[item.difficulty]}
      </p>
      <p className="phase-prompt">{template.prompt}</p>
      {item.questionType === "bar" && parts.length > 0 ? (
        <div className="bar-model" aria-label="Bar diagram">
          <div className="bar-parts">
            {parts.map((part, index) => (
              <span key={`${part}-${index}`} style={{ flexGrow: part }}>
                {part}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      {template.steps && template.steps.length > 0 ? (
        <ol className="phase-steps">
          {template.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
      {template.lines && template.lines.length > 0 ? <MistakeLines lines={template.lines} /> : null}
      {template.choices && template.choices.length > 0 ? (
        <fieldset className="phase-choices">
          <legend>Choose one reason</legend>
          {template.choices.map((choice) => (
            <label key={choice} className="phase-choice">
              <input type="radio" name="reason" />
              <span>{choice}</span>
            </label>
          ))}
        </fieldset>
      ) : null}
      {item.questionType === "mistake" ? (
        <label className="phase-answer">
          Type the fix
          <input className="answer-input" name="fix" inputMode="text" autoComplete="off" />
        </label>
      ) : template.choices ? null : (
        <label className="phase-answer">
          Your answer
          <input className="answer-input" name="answer" inputMode="numeric" autoComplete="off" />
        </label>
      )}
    </article>
  );
}
