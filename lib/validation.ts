const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIRST_NAME = /^[\p{L}][\p{L}'’\- ]{0,39}$/u;

/** Child profiles are stored with at most this many characters. */
export const CHILD_FIRST_NAME_MAX = 30;
const USERNAME = /^[a-z0-9]{3,20}$/;
const PIN = /^[0-9]{4,6}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return value.length <= 320 && EMAIL.test(value);
}

export function normalizeFirstName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isValidFirstName(value: string): boolean {
  return FIRST_NAME.test(value);
}

export function childFirstNameError(value: string): string | null {
  if (!value || value.length > CHILD_FIRST_NAME_MAX || !isValidFirstName(value)) {
    return "Use a first name, up to 30 letters.";
  }
  return null;
}

/** A save error that belongs under the child first-name field. */
export function childNameFieldMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message.toLowerCase().includes("first name") ? message : undefined;
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME.test(value);
}

export function isValidPin(value: string): boolean {
  return PIN.test(value);
}
