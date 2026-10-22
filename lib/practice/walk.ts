/**
 * Guided "Show me" steps for a question.
 * Generators attach one when the skill can point at part of the prompt.
 * Other skills leave it empty and keep the text "Here's how".
 */

export type BaseTenVisual = {
  kind: "base-ten";
  hundreds: number;
  tens: number;
  ones: number;
  focus?: "ones" | "tens" | "hundreds" | "trade";
};

export type GroupsVisual = {
  kind: "groups";
  groups: number;
  each: number;
};

export type ArrayVisual = {
  kind: "array";
  rows: number;
  columns: number;
};

export type NumberLineVisual = {
  kind: "number-line";
  parts: number;
  shaded: number;
  hops: boolean;
};

export type ClockVisual = {
  kind: "clock";
  hour: number;
  minute: number;
  focus?: "hour" | "minute";
};

export type WalkVisual = BaseTenVisual | GroupsVisual | ArrayVisual | NumberLineVisual | ClockVisual;

export type WalkStep = {
  /** A token in the prompt: a number, an operator, or a word. */
  target: string;
  /** Which matching token, when the same text appears more than once. */
  occurrence?: number;
  /** At most 8 words. The answer stays out of the caption. */
  caption: string;
  visual?: WalkVisual;
};

export type Walkthrough = {
  steps: WalkStep[];
  /** The generator's answer. The last step asks the child to type it. */
  answer: string;
};

const WALK_SKILLS = new Set(["g3-add-sub", "g3-mult", "g3-fractions", "g3-time"]);

/** Skills that have a step spec. Others start with a hint and never grow a fake walk. */
export function skillCanWalk(skillId: string): boolean {
  return WALK_SKILLS.has(skillId);
}

export function walkForSkill(skillId: string, prompt: string, answer: string): Walkthrough | null {
  if (!WALK_SKILLS.has(skillId)) return null;
  return walkForQuestion(prompt, answer);
}

export function walkForQuestion(prompt: string, answer: string): Walkthrough | null {
  const add = prompt.match(/^(\d+) \+ (\d+) = \?$/);
  if (add) return sameAnswer(additionWalk(Number(add[1]), Number(add[2])), answer);

  const sub = prompt.match(/^(\d+) − (\d+) = \?$/);
  if (sub) return sameAnswer(subtractionWalk(Number(sub[1]), Number(sub[2])), answer);

  const mult = prompt.match(/^(\d+) × (\d+) = \?$/);
  if (mult) return sameAnswer(multiplicationWalk(Number(mult[1]), Number(mult[2])), answer);

  const fraction = prompt.match(/split into (\d+) equal parts\. What fraction is (\d+) parts from zero\?$/);
  if (fraction) return sameAnswer(fractionWalk(Number(fraction[1]), Number(fraction[2])), answer);

  const time = prompt.match(/^It is (\d{1,2}):(\d{2})\. What time is it (\d+) minutes later\?$/);
  if (time) return clockWalk(Number(time[1]), Number(time[2]), Number(time[3]), answer);

  return null;
}

function sameAnswer(walk: Walkthrough | null, answer: string): Walkthrough | null {
  if (!walk || walk.answer !== answer) return null;
  return walk;
}

export type PromptToken = { text: string; start: number; end: number };

const TOKEN = /(\d{1,2}:\d{2})|(\d+)|([+−\-×÷=?])|([A-Za-z]+)/g;

export function promptTokens(prompt: string): PromptToken[] {
  const tokens: PromptToken[] = [];
  for (const match of prompt.matchAll(TOKEN)) {
    const text = match[0];
    const start = match.index ?? 0;
    tokens.push({ text, start, end: start + text.length });
  }
  return tokens;
}

export function targetSpan(prompt: string, target: string, occurrence = 0): PromptToken | null {
  let seen = 0;
  for (const token of promptTokens(prompt)) {
    if (token.text !== target) continue;
    if (seen === occurrence) return token;
    seen += 1;
  }
  return null;
}

export function captionWordCount(caption: string): number {
  return caption.trim().split(/\s+/).filter(Boolean).length;
}

export function additionWalk(left: number, right: number): Walkthrough | null {
  if (!whole(left) || !whole(right) || left > 999 || right > 999) return null;
  const ones = (left % 10) + (right % 10);
  const tens = digit(left, 10) + digit(right, 10) + (ones >= 10 ? 1 : 0);
  if (ones < 10 && tens < 10) return null;

  const tradeOnes = ones >= 10;
  const rightOccurrence = left === right ? 1 : 0;
  return finish(
    [
      step(String(left), "Add the ones first.", blocks(left, "ones")),
      step(
        String(right),
        tradeOnes ? "Trade ones for a ten." : "Trade tens for a hundred.",
        tradeOnes
          ? { kind: "base-ten", hundreds: 0, tens: 1, ones: ones - 10, focus: "trade" }
          : { kind: "base-ten", hundreds: 1, tens: tens - 10, ones: ones % 10, focus: "trade" },
        rightOccurrence,
      ),
      step("+", "Add the next place.", blocks(right, tradeOnes ? "tens" : "hundreds")),
      step("?", "Type the sum."),
    ],
    String(left + right),
  );
}

export function subtractionWalk(start: number, take: number): Walkthrough | null {
  if (!whole(start) || !whole(take) || take > start || start > 999) return null;
  const onesBorrow = start % 10 < take % 10;
  const tensLeft = digit(start, 10) - (onesBorrow ? 1 : 0);
  const tensBorrow = tensLeft < digit(take, 10);
  if (!onesBorrow && !tensBorrow) return null;

  return finish(
    [
      step(String(start), "Check the ones place.", blocks(start, "ones")),
      step(String(take), "These ones need a trade.", {
        kind: "base-ten",
        hundreds: 0,
        tens: 0,
        ones: 10 + (start % 10),
        focus: "trade",
      }),
      step("−", "Trade a ten for ones.", blocks(start, "tens")),
      step("?", "Type the difference."),
    ],
    String(start - take),
  );
}

export function multiplicationWalk(left: number, right: number): Walkthrough | null {
  if (!whole(left) || !whole(right) || left > 10 || right > 10) return null;
  const rightOccurrence = left === right ? 1 : 0;
  return finish(
    [
      step(String(left), "Make this many groups.", { kind: "groups", groups: left, each: right }),
      step(String(right), "See them as an array.", { kind: "array", rows: Math.max(left, 1), columns: Math.max(right, 1) }, rightOccurrence),
      step("×", "Count every equal group."),
      step("?", "Type how many."),
    ],
    String(left * right),
  );
}

export function fractionWalk(parts: number, shaded: number): Walkthrough | null {
  if (!whole(parts) || !whole(shaded) || parts < 2 || parts > 12 || shaded < 1 || shaded > parts) return null;
  const shadedOccurrence = parts === shaded ? 1 : 0;
  return finish(
    [
      step(String(parts), "Count the equal parts.", { kind: "number-line", parts, shaded, hops: false }),
      step(String(shaded), "Hop this many parts.", { kind: "number-line", parts, shaded, hops: true }, shadedOccurrence),
      step("fraction", "That point is the fraction."),
      step("line", "Type the fraction."),
    ],
    `${shaded}/${parts}`,
  );
}

export function clockWalk(hour: number, minute: number, add: number, answer: string): Walkthrough | null {
  if (!whole(hour) || !whole(minute) || !whole(add)) return null;
  if (hour < 1 || hour > 12 || minute > 59 || add < 1 || add > 90) return null;
  const total = minute + add;
  const endMinute = total % 60;
  const endHour = total >= 60 ? (hour === 12 ? 1 : hour + 1) : hour;
  const start = `${hour}:${String(minute).padStart(2, "0")}`;
  const expected = `${endHour}:${String(endMinute).padStart(2, "0")}`;
  if (answer !== expected) return null;
  return finish(
    [
      step(start, "Find the hour hand.", { kind: "clock", hour, minute, focus: "hour" }),
      step(start, "Find the minute hand.", { kind: "clock", hour, minute, focus: "minute" }, 0),
      step(String(add), "Count these minutes ahead.", { kind: "clock", hour: endHour, minute: endMinute, focus: "minute" }),
      step("later", "Type the new time."),
    ],
    answer,
  );
}

/** Quiet parent-desk line. Zero uses stay off the desk. */
export function showMeUseLine(count: number): string | null {
  if (!Number.isInteger(count) || count < 1) return null;
  return `Used Show me on ${count} ${count === 1 ? "question" : "questions"}`;
}

function blocks(value: number, focus: BaseTenVisual["focus"]): BaseTenVisual {
  return {
    kind: "base-ten",
    hundreds: Math.min(9, Math.floor(value / 100)),
    tens: digit(value, 10),
    ones: value % 10,
    focus,
  };
}

function digit(value: number, place: number): number {
  return Math.floor(value / place) % 10;
}

function whole(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function step(target: string, caption: string, visual?: WalkVisual, occurrence = 0): WalkStep {
  if (captionWordCount(caption) < 1 || captionWordCount(caption) > 8) {
    throw new Error(`Walk caption must be 1 to 8 words: "${caption}"`);
  }
  return {
    target,
    caption,
    ...(occurrence > 0 ? { occurrence } : {}),
    ...(visual ? { visual } : {}),
  };
}

function finish(steps: WalkStep[], answer: string): Walkthrough {
  if (steps.length < 3 || steps.length > 5) {
    throw new Error(`A walkthrough needs 3 to 5 steps, got ${steps.length}.`);
  }
  const hidden = answer.toLowerCase().replace(/\s+/g, "");
  for (const item of steps) {
    const caption = item.caption.toLowerCase().replace(/\s+/g, "");
    if (hidden && caption.includes(hidden)) {
      throw new Error(`Caption reveals the answer: ${item.caption}`);
    }
  }
  return { steps, answer };
}
