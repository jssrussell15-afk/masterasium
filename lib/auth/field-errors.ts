export const AUTH_FIELDS = ["email", "password", "username", "firstName", "pin"] as const;

export type AuthField = (typeof AUTH_FIELDS)[number];

export type FieldErrors = Partial<Record<AuthField, string>>;

const FIELD_LABEL: Record<AuthField, string> = {
  email: "email",
  password: "password",
  username: "username",
  firstName: "first name",
  pin: "PIN",
};

export function isAuthField(value: string): value is AuthField {
  return (AUTH_FIELDS as readonly string[]).includes(value);
}

/** Short card summary, plus the message under each field it belongs to. */
export function placeAuthError(message: string): { summary: string; fields: FieldErrors } {
  const fields = fieldsForMessage(message);
  return { summary: authSummary(fields, message), fields };
}

export function authSummary(fields: FieldErrors, message: string): string {
  const names = AUTH_FIELDS.filter((field) => fields[field]);
  if (names.length === 0) return message;
  if (names.length === 1) return `Check the ${FIELD_LABEL[names[0]]}.`;
  return "Check the highlighted fields.";
}

export function firstAuthField(fields: FieldErrors, order: readonly AuthField[]): AuthField | null {
  return order.find((field) => fields[field]) ?? null;
}

export function messageForValidity(field: AuthField, validity: ValidityState): string | null {
  if (validity.valid) return null;
  if (field === "email") {
    return validity.valueMissing ? "Enter an email address." : "Enter a valid email address.";
  }
  if (field === "password") {
    if (validity.valueMissing) return "Enter a password.";
    if (validity.tooLong) return "Use 72 characters or fewer.";
    return "Use at least 8 characters.";
  }
  if (field === "username") {
    return validity.valueMissing
      ? "Enter a username."
      : "Use 3 to 20 letters or numbers, with no spaces.";
  }
  if (field === "firstName") {
    return validity.valueMissing ? "Enter a first name." : "Use a first name, up to 40 letters.";
  }
  return validity.valueMissing ? "Enter a PIN." : "Use a PIN of 4 to 6 digits.";
}

export function fieldDescribedBy(errorId: string, message: string | undefined, extraIds: string[] = []): string | undefined {
  const ids = [...(message ? [errorId] : []), ...extraIds];
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function fieldsForMessage(message: string): FieldErrors {
  const known: Record<string, FieldErrors> = {
    "Enter an email address.": { email: message },
    "Enter a valid email address.": { email: message },
    "Enter a password.": { password: message },
    "Use at least 8 characters.": { password: message },
    "Use 72 characters or fewer.": { password: message },
    "Enter a username.": { username: message },
    "Use 3 to 20 letters or numbers, with no spaces.": { username: message },
    "Enter a first name.": { firstName: message },
    "Use a first name, up to 40 letters.": { firstName: message },
    "Enter a PIN.": { pin: message },
    "Use a PIN of 4 to 6 digits.": { pin: message },
    "That username or PIN is not right.": { username: message, pin: message },
    "That name or PIN is not right.": { firstName: message, pin: message },
  };
  if (known[message]) return known[message];

  const text = message.toLowerCase();
  if (text.includes("invalid login credentials")) {
    return { email: message, password: message };
  }
  if (
    text.includes("email not confirmed") ||
    text.includes("already registered") ||
    text.includes("already been registered") ||
    text.includes("user already")
  ) {
    return { email: message };
  }
  if (text.includes("password")) return { password: message };
  if (text.includes("email")) return { email: message };
  if (text.includes("username") && text.includes("pin")) {
    return { username: message, pin: message };
  }
  if (text.includes("name") && text.includes("pin")) {
    return { firstName: message, pin: message };
  }
  if (text.includes("username")) return { username: message };
  if (text.includes("first name")) return { firstName: message };
  if (text.includes("pin")) return { pin: message };
  return {};
}
