const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PIN_ASSIGNMENT = /\b(pin|password|passwd)\b(\s*[:=]?\s*)(\d{4,8})/gi;

export type ScrubbedError = {
  message: string;
  stack?: string;
  digest?: string;
};

/** Removes emails, PIN assignments, and known child names before a log line is written. */
export function scrubLog(value: string, names: readonly string[] = []): string {
  let next = value.replace(EMAIL, "[email]").replace(PIN_ASSIGNMENT, "$1$2[hidden]");
  for (const name of names) {
    const trimmed = name.trim();
    if (trimmed.length < 2) continue;
    next = next.split(trimmed).join("[name]");
  }
  return next;
}

export function scrubError(
  error: { message?: string; stack?: string; digest?: string },
  names: readonly string[] = [],
): ScrubbedError {
  return {
    message: scrubLog(error.message ?? "", names),
    ...(error.stack ? { stack: scrubLog(error.stack, names) } : {}),
    ...(error.digest ? { digest: error.digest } : {}),
  };
}
