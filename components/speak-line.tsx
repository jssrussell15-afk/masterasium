"use client";

/** Reads one kid-facing line. Quiet: no chime, no reward. */
export function speakText(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-CA";
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

export function SpeakButton({ text, label = "Read aloud" }: { text: string; label?: string }) {
  if (!text.trim()) return null;
  return (
    <button type="button" className="speak-btn" aria-label={label} onClick={() => speakText(text)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="speak-icon">
        <path
          fill="currentColor"
          d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a3.5 3.5 0 0 0-1.8-3.06v6.12A3.5 3.5 0 0 0 15.5 12z"
        />
      </svg>
    </button>
  );
}

export function SpeakLine({
  text,
  as: Tag = "p",
  className,
}: {
  text: string;
  as?: "p" | "h1" | "h2";
  className?: string;
}) {
  return (
    <Tag className={className ? `speak-line ${className}` : "speak-line"}>
      <span>{text}</span>
      <SpeakButton text={text} />
    </Tag>
  );
}
