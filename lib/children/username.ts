import { isValidUsername } from "@/lib/validation";

/** Letters and digits from a first name, used only to store a unique username. */
export function nameLetters(firstName: string): string {
  return firstName
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * A stored username derived from the first name.
 * `attempt` 1 is the plain name. Later attempts add a number when that name is taken.
 * The student does not type this at sign-in.
 */
export function storedUsername(firstName: string, attempt: number): string | null {
  const letters = nameLetters(firstName);
  if (!letters || attempt < 1 || attempt > 50) return null;
  const suffix = attempt === 1 ? "" : String(attempt);
  const room = 20 - suffix.length;
  if (room < 1) return null;
  let stem = letters.slice(0, room);
  if (stem.length + suffix.length < 3) {
    stem = (stem + "111").slice(0, Math.max(1, 3 - suffix.length));
  }
  const username = stem + suffix;
  return isValidUsername(username) ? username : null;
}
