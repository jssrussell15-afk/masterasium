export function PracticeShot() {
  return (
    <figure className="card practice-shot">
      <figcaption className="eyebrow">Practice</figcaption>
      <p className="hint mt-2 text-sm">Focus · Decimals to hundredths</p>
      <p className="mt-3 text-2xl font-semibold">What is 0.4 + 0.3?</p>
      <p className="lesson mt-3">Start at 4 tenths and count on 3 tenths.</p>
      <div className="field mt-3">
        <span>Answer</span>
        <div className="shot-input" aria-hidden="true" />
      </div>
    </figure>
  );
}
