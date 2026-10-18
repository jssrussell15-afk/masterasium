"use client";

import { useEffect, useState } from "react";

export function speechSupported(): boolean {
  if (typeof window === "undefined") return false;
  const host = window as Window & { SpeechSynthesisUtterance?: new (text: string) => SpeechSynthesisUtterance };
  const synth = host.speechSynthesis;
  return typeof synth?.speak === "function" && typeof host.SpeechSynthesisUtterance === "function";
}

/** Speaker control for question text, hints, feedback, and intro cards. Hidden when speech is unavailable. */
export function ReadAloud({ text, label }: { text: string; label: string }) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(speechSupported());
  }, []);

  if (!supported || !text.trim()) return null;

  return (
    <button
      type="button"
      className="read-aloud"
      aria-label={label}
      onClick={() => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-CA";
        window.speechSynthesis.speak(utterance);
      }}
    >
      <span aria-hidden="true">Speak</span>
    </button>
  );
}
