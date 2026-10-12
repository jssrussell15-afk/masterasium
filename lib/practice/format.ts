export function formatAccuracy(attempted: number, correct: number): string {
  if (attempted === 0) return "—";
  return `${Math.round((correct / attempted) * 100)}%`;
}
