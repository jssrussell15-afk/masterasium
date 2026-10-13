const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeAccessCode(rng: () => number = Math.random, length = 6): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += ALPHABET[Math.floor(rng() * ALPHABET.length)] ?? "M";
  }
  return code;
}

export function normalizeAccessCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
