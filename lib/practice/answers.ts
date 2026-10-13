export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .replaceAll("−", "-")
    .replace(/^\$/, "");
}

export function answersMatch(expected: string, given: string): boolean {
  const left = normalizeAnswer(expected);
  const right = normalizeAnswer(given);
  if (!right) return false;
  if (left === right) return true;
  if (left.includes("/") || right.includes("/")) return false;
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;
  return Math.abs(leftNumber - rightNumber) < 1e-9;
}
