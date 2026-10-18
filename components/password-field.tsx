"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { fieldDescribedBy } from "@/lib/auth/field-errors";

type Caret = { start: number; end: number };

export function PasswordField({
  id,
  autoComplete,
  errorId,
  error,
  hintId,
  hint,
  onInvalid,
}: {
  id: string;
  autoComplete: "new-password" | "current-password";
  errorId: string;
  error?: string;
  hintId?: string;
  hint?: string;
  onInvalid?: (event: FormEvent<HTMLInputElement>) => void;
}) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const caret = useRef<Caret | null>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    const range = caret.current;
    caret.current = null;
    if (!input || !range) return;
    input.focus();
    const length = input.value.length;
    const start = Math.min(range.start, length);
    const end = Math.min(range.end, length);
    try {
      input.setSelectionRange(start, end);
    } catch {
      // A few browsers reject a caret range while the control is type=password.
    }
  }, [visible]);

  function rememberCaret() {
    const input = inputRef.current;
    if (!input) return;
    if (document.activeElement !== input && caret.current) return;
    const length = input.value.length;
    caret.current = {
      start: input.selectionStart ?? length,
      end: input.selectionEnd ?? length,
    };
  }

  function toggle() {
    rememberCaret();
    setVisible((current) => !current);
  }

  return (
    <div className="field">
      <label htmlFor={id}>Password</label>
      <div className="password-field">
        <input
          ref={inputRef}
          id={id}
          name="password"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={8}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={fieldDescribedBy(errorId, error, hintId ? [hintId] : [])}
          onInvalid={onInvalid}
        />
        <button
          type="button"
          className="password-toggle"
          aria-pressed={visible}
          aria-label={visible ? "Hide password" : "Show password"}
          onPointerDown={rememberCaret}
          onClick={toggle}
        >
          {visible ? <EyeSlashIcon /> : <EyeIcon />}
        </button>
      </div>
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
      {hint && hintId ? (
        <p id={hintId} className="hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="password-eye">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="password-eye">
      <path
        d="M3 4.5 20.5 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.9 6.4A11 11 0 0 1 12 6c6.4 0 10 6 10 6a18 18 0 0 1-3.6 4.4M6.2 7.2C3.5 8.8 2 12 2 12a18.5 18.5 0 0 0 6.4 6.2A11 11 0 0 0 15 19.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.9 10.1a3 3 0 0 0 4.1 4.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
