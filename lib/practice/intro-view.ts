import type { IntroCycle } from "@/lib/practice/memory";

/** How long the student must stay on the intro. The timer is the only exit. */
export const INTRO_SECONDS = 10;

/** Days since the last attempt before the same skill shows its intro again. */
export const INTRO_GAP_DAYS = 30;

export const INTRO_PLACEHOLDER = "Quick intro coming soon";

export type IntroStyle = "visual" | "steps" | "why";

export type IntroBeat = {
  caption: string;
  prompt?: string;
  steps?: string[];
  answer?: string;
};

export type SkillIntro = {
  skillId: string;
  cycle: IntroCycle;
  seconds: number;
  style: IntroStyle;
  placeholder: string;
  /** Public image path. Null until a real intro asset exists for the skill. */
  asset: string | null;
  beats: IntroBeat[];
};

export function introStyle(grade: number): IntroStyle {
  if (grade <= 3) return "visual";
  if (grade >= 9) return "why";
  return "steps";
}

/**
 * Beat index and remaining whole seconds for a timer that started `elapsedMs` ago.
 * Several beats share one countdown. At `seconds` the intro is done.
 */
export function introProgress(
  elapsedMs: number,
  seconds: number,
  beatCount: number,
): { beat: number; remaining: number; done: boolean } {
  const safeSeconds = seconds > 0 ? seconds : INTRO_SECONDS;
  const total = safeSeconds * 1000;
  const beats = Math.max(1, beatCount);
  const elapsed = Math.max(0, elapsedMs);
  const done = elapsed >= total;
  const clamped = Math.min(elapsed, total);
  const beat = Math.min(beats - 1, Math.floor(clamped / (total / beats)));
  const remaining = done ? 0 : Math.max(0, safeSeconds - Math.floor(elapsed / 1000));
  return { beat, remaining, done };
}
