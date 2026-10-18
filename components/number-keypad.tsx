const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

export function NumberKeypad({
  disabled,
  onDigit,
  onDelete,
  extras = [],
}: {
  disabled: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  extras?: string[];
}) {
  const extra = extras[0];
  return (
    <div className="number-pad" role="group" aria-label="Number keypad">
      {DIGITS.map((digit) => (
        <button key={digit} type="button" disabled={disabled} onClick={() => onDigit(digit)}>
          {digit}
        </button>
      ))}
      {extra ? (
        <button type="button" disabled={disabled} onClick={() => onDigit(extra)} aria-label={extra === "/" ? "Fraction bar" : "Colon"}>
          {extra}
        </button>
      ) : (
        <span aria-hidden="true" />
      )}
      <button type="button" disabled={disabled} onClick={() => onDigit("0")}>
        0
      </button>
      <button type="button" data-key="delete" aria-label="Delete" disabled={disabled} onClick={onDelete}>
        Delete
      </button>
    </div>
  );
}
