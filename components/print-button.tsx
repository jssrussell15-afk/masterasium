"use client";

export function PrintButton() {
  return (
    <button className="print-button no-print" type="button" onClick={() => window.print()}>
      Print this page
    </button>
  );
}
