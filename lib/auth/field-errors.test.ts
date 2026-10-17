import { describe, expect, it } from "vitest";
import {
  authSummary,
  fieldDescribedBy,
  firstAuthField,
  messageForValidity,
  placeAuthError,
} from "@/lib/auth/field-errors";

function validity(partial: Partial<ValidityState>): ValidityState {
  return {
    badInput: false,
    customError: false,
    patternMismatch: false,
    rangeOverflow: false,
    rangeUnderflow: false,
    stepMismatch: false,
    tooLong: false,
    tooShort: false,
    typeMismatch: false,
    valid: false,
    valueMissing: false,
    ...partial,
  };
}

describe("auth field errors", () => {
  it("puts a validation message under its field and keeps the summary short", () => {
    expect(placeAuthError("Enter a valid email address.")).toEqual({
      summary: "Check the email.",
      fields: { email: "Enter a valid email address." },
    });
    expect(placeAuthError("Use at least 8 characters.")).toEqual({
      summary: "Check the password.",
      fields: { password: "Use at least 8 characters." },
    });
    expect(placeAuthError("Use a PIN of 4 to 6 digits.").fields.pin).toBe(
      "Use a PIN of 4 to 6 digits.",
    );
  });

  it("shares a credential failure across both fields", () => {
    expect(placeAuthError("Invalid login credentials")).toEqual({
      summary: "Check the highlighted fields.",
      fields: { email: "Invalid login credentials", password: "Invalid login credentials" },
    });
    expect(placeAuthError("That username or PIN is not right.").summary).toBe(
      "Check the highlighted fields.",
    );
    expect(placeAuthError("That name or PIN is not right.").fields).toEqual({
      firstName: "That name or PIN is not right.",
      pin: "That name or PIN is not right.",
    });
    expect(firstAuthField(placeAuthError("That username or PIN is not right.").fields, [
      "username",
      "pin",
    ])).toBe("username");
  });

  it("leaves account-level problems as the summary", () => {
    const message = "Too many tries. Wait a few minutes and try again.";
    expect(placeAuthError(message)).toEqual({ summary: message, fields: {} });
    expect(authSummary({}, message)).toBe(message);
  });

  it("describes the field with the error id and any standing hint", () => {
    expect(fieldDescribedBy("signup-password-error", "Use at least 8 characters.", [
      "signup-password-hint",
    ])).toBe("signup-password-error signup-password-hint");
    expect(fieldDescribedBy("auth-email-error", undefined, [])).toBeUndefined();
  });

  it("reads the browser validity state", () => {
    expect(messageForValidity("email", validity({ valueMissing: true }))).toBe(
      "Enter an email address.",
    );
    expect(messageForValidity("email", validity({ typeMismatch: true }))).toBe(
      "Enter a valid email address.",
    );
    expect(messageForValidity("password", validity({ tooShort: true }))).toBe(
      "Use at least 8 characters.",
    );
    expect(messageForValidity("username", validity({ patternMismatch: true }))).toBe(
      "Use 3 to 20 letters or numbers, with no spaces.",
    );
    expect(messageForValidity("pin", validity({ valid: true }))).toBeNull();
  });
});
