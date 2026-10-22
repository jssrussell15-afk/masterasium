"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";

export type SpokenWord = { text: string; start: number; end: number };

export function splitWords(text: string): SpokenWord[] {
  const words: SpokenWord[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    words.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return words;
}

/** Map a speechSynthesis boundary index onto a word. Whitespace lands on the following word. */
export function wordIndexAt(words: SpokenWord[], charIndex: number): number {
  if (words.length === 0) return -1;
  const exact = words.findIndex((word) => charIndex >= word.start && charIndex < word.end);
  if (exact >= 0) return exact;
  const next = words.findIndex((word) => word.start >= charIndex);
  return next === -1 ? words.length - 1 : next;
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="listen-icon">
      <path
        fill="currentColor"
        d="M4 9v6h4l5 4V5L8 9H4zm11.5 3a3.5 3.5 0 0 0-1.8-3.06v6.12A3.5 3.5 0 0 0 15.5 12z"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="listen-icon">
      <rect x="7" y="7" width="10" height="10" fill="currentColor" />
    </svg>
  );
}

export function ListenButton({
  speaking,
  compact = false,
  onClick,
}: {
  speaking: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const label = speaking ? "Stop" : "Listen";
  return (
    <button
      type="button"
      className={compact ? "listen listen-choice" : "listen"}
      aria-pressed={speaking}
      onClick={onClick}
    >
      {speaking ? <StopIcon /> : <SpeakerIcon />}
      <span className={compact ? "visually-hidden" : undefined}>{label}</span>
    </button>
  );
}

export function HighlightedWords({ text, activeWord }: { text: string; activeWord: number | null }) {
  const words = splitWords(text);
  if (words.length === 0 || activeWord == null) return text;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  words.forEach((word, index) => {
    if (word.start > cursor) nodes.push(text.slice(cursor, word.start));
    nodes.push(
      <span key={`${word.start}-${word.text}`} className={activeWord === index ? "listen-word" : undefined}>
        {word.text}
      </span>,
    );
    cursor = word.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

type SpeechHandle = {
  speaking: boolean;
  activeWord: number | null;
  toggle: () => void;
  stop: () => void;
};

function speechReady(): boolean {
  if (typeof window === "undefined") return false;
  const synth = window.speechSynthesis;
  return typeof synth?.speak === "function" && typeof window.SpeechSynthesisUtterance === "function";
}

export function useSpoken(text: string, options?: { auto?: boolean; active?: boolean; rate?: number }): SpeechHandle {
  const auto = options?.auto ?? false;
  const active = options?.active ?? true;
  const rate = options?.rate;
  const [speaking, setSpeaking] = useState(false);
  const [activeWord, setActiveWord] = useState<number | null>(null);
  const token = useRef(0);
  const speakingRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function clearVisual() {
    speakingRef.current = false;
    setSpeaking(false);
    setActiveWord(null);
  }

  function stop() {
    token.current += 1;
    clearVisual();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }

  function begin() {
    const spoken = text.trim();
    if (!mounted.current || !spoken || !speechReady()) return;
    const id = ++token.current;
    window.speechSynthesis.cancel();
    speakingRef.current = true;
    setSpeaking(true);
    setActiveWord(null);

    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = "en-CA";
    if (rate != null) utterance.rate = rate;
    let sawBoundary = false;
    const mine = () => mounted.current && token.current === id;

    utterance.onboundary = (event) => {
      if (!mine()) return;
      if (event.name && event.name !== "word") return;
      sawBoundary = true;
      setActiveWord(wordIndexAt(splitWords(spoken), event.charIndex ?? 0));
    };
    utterance.onend = () => {
      if (!mine()) return;
      clearVisual();
    };
    utterance.onerror = (event) => {
      if (!mine()) return;
      const code = event.error;
      if (code === "interrupted" || code === "canceled") clearVisual();
    };

    const words = splitWords(spoken).length || 1;
    window.setTimeout(() => {
      if (!mine() || sawBoundary) return;
      clearVisual();
    }, Math.min(8000, Math.max(1200, words * 380)));

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // The browser refused speech. Stop still shows until the timer above.
    }
  }

  const beginEvent = useEffectEvent(begin);

  useEffect(() => {
    return () => {
      token.current += 1;
      speakingRef.current = false;
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      queueMicrotask(() => {
        if (!mounted.current) return;
        setSpeaking(false);
        setActiveWord(null);
      });
    };
  }, [text]);

  useEffect(() => {
    if (!auto || !active || !text.trim()) return;
    const handle = window.setTimeout(() => beginEvent(), 0);
    return () => {
      window.clearTimeout(handle);
      token.current += 1;
      speakingRef.current = false;
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      queueMicrotask(() => {
        if (!mounted.current) return;
        setSpeaking(false);
        setActiveWord(null);
      });
    };
  }, [auto, active, text]);

  function toggle() {
    if (speakingRef.current) stop();
    else begin();
  }

  return { speaking, activeWord, toggle, stop };
}

export function ListenPassage({
  parts,
  auto = false,
  active = true,
  className,
}: {
  parts: { text: string; as?: "p" | "h1" | "h2" | "span"; className?: string; id?: string }[];
  auto?: boolean;
  active?: boolean;
  className?: string;
}) {
  const spokenParts = parts.filter((part) => part.text.trim());
  const spoken = spokenParts.map((part) => part.text.trim()).join(" ");
  const speech = useSpoken(spoken, { auto, active });
  const ranges = spokenParts.reduce<{ start: number; text: string }[]>((list, part) => {
    const previous = list[list.length - 1];
    const start = previous ? previous.start + previous.text.length + 1 : 0;
    return [...list, { start, text: part.text.trim() }];
  }, []);

  return (
    <div className={className ? `listen-line ${className}` : "listen-line"}>
      <ListenButton speaking={speech.speaking} onClick={speech.toggle} />
      <div className="listen-copy">
        {spokenParts.map((part, index) => {
          const Tag = part.as ?? "p";
          const range = ranges[index];
          const localWord =
            speech.activeWord == null
              ? null
              : localWordIndex(spoken, range?.start ?? 0, range?.text ?? "", speech.activeWord);
          return (
            <Tag key={`${part.text}-${index}`} id={part.id} className={part.className}>
              <HighlightedWords text={part.text.trim()} activeWord={localWord} />
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

function localWordIndex(spoken: string, start: number, part: string, activeWord: number): number | null {
  const global = splitWords(spoken);
  const word = global[activeWord];
  if (!word || word.start < start || word.start >= start + part.length) return null;
  const local = splitWords(part);
  return local.findIndex((item) => item.start === word.start - start);
}

/** A 48px Listen pill that sits outside an answer tile. */
export function ChoiceOption({
  text,
  showListen,
  pressed = false,
  disabled = false,
  onPick,
  children,
}: {
  text: string;
  showListen: boolean;
  pressed?: boolean;
  disabled?: boolean;
  onPick: () => void;
  children?: ReactNode;
}) {
  const speech = useSpoken(text);
  return (
    <div className="answer-choice">
      {showListen ? <ListenButton compact speaking={speech.speaking} onClick={speech.toggle} /> : null}
      <button
        type="button"
        className="answer-choice-tile"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onPick}
      >
        {children ?? (
          <HighlightedWords text={text} activeWord={showListen ? speech.activeWord : null} />
        )}
      </button>
    </div>
  );
}
