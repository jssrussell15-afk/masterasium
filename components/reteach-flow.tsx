import { BaseTenBlocks, FractionBars, NumberLine } from "@/components/manipulatives";
import { needsReviewLine, returnedLine } from "@/lib/reteach/copy";
import { guidedFor } from "@/lib/reteach/catalog";
import { plainSkill } from "@/lib/reteach/prereq";
import { ENTER_LINE, RETURN_LINE } from "@/lib/reteach/types";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

export function ReteachFlow({
  scene,
}: {
  scene: "base-ten" | "number-line" | "fraction" | "in" | "out" | "parent";
}) {
  if (scene === "base-ten") return <BaseTenBlocks />;
  if (scene === "number-line") return <NumberLine />;
  if (scene === "fraction") return <FractionBars />;
  if (scene === "out") return <OutCard />;
  if (scene === "parent") return <ParentNotes />;
  return <InCard />;
}

function InCard() {
  const example = guidedFor("g2-add-sub");
  const step = example?.steps[0] ?? "";
  return (
    <section className="card reteach-card" data-scene="in">
      <p className="hint">{ENTER_LINE}</p>
      <p className="topic-label">Show me</p>
      <p className="prompt">{example?.prompt}</p>
      <p className="show-style-caption">{step}</p>
      <p className="hint">Step 1 of {example?.steps.length ?? 1}</p>
    </section>
  );
}

function OutCard() {
  return (
    <section className="card reteach-card" data-scene="out">
      <p className="hint">{RETURN_LINE}</p>
      <p className="topic-label">Adding within 1,000</p>
      <p className="prompt">250 + 175 = ?</p>
      <label className="show-style-entry">
        <span className="hint">Your answer</span>
        <input className="reteach-answer" inputMode="numeric" defaultValue="" />
      </label>
      <div className="number-pad" aria-label="Number keypad">
        {DIGITS.map((digit) => (
          <button key={digit} type="button">
            {digit}
          </button>
        ))}
      </div>
    </section>
  );
}

function ParentNotes() {
  const plain = plainSkill("g2-add-sub");
  return (
    <section className="card" data-scene="parent" aria-label="Parent notes">
      <h1 className="text-2xl font-semibold">Sam</h1>
      <p className="hint">{returnedLine(plain)}</p>
      <p className="hint">{needsReviewLine(plainSkill("g2-place"))}</p>
    </section>
  );
}
