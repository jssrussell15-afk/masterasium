import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionPractice } from "@/components/question-practice";
import { freshFeedback, reduceFeedback } from "@/lib/practice/feedback";
import { generateQuestion } from "@/lib/practice/generate";
import { packStoredAnswer, readStoredWalk, withAttemptMark } from "@/lib/practice/stored-answer";
import { showMeUseLine, targetSpan, type Walkthrough } from "@/lib/practice/walk";
import type { Question } from "@/lib/practice/types";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(skillId: string, accept: (question: Question) => boolean): Question {
  const rng = mulberry32(11);
  for (let index = 0; index < 80; index += 1) {
    const question = generateQuestion(skillId, rng);
    if (accept(question)) return question;
  }
  throw new Error(`No walkthrough sample for ${skillId}.`);
}

function renderWalk(question: Question, step: number, handoff = false): string {
  const walk = question.walk as Walkthrough;
  return renderToStaticMarkup(
    createElement(QuestionPractice, {
      questionId: `${question.skillId}-${step}-${handoff ? "turn" : "step"}`,
      eyebrow: "Focus · Grade 3",
      prompt: question.prompt,
      responseHint: null,
      shape: { kind: "single", inputMode: question.answer.includes(":") || question.answer.includes("/") ? "text" : "numeric" },
      hint: "Look at the first part.",
      example: null,
      progress: { index: 1, total: 10 },
      phase: "revealed",
      why: null,
      steps: question.steps,
      expected: question.answer,
      walk,
      walkStart: { step, handoff },
    }),
  );
}

describe("show me step specs", () => {
  const addition = sample("g3-add-sub", (question) => question.prompt.includes("+") && question.walk != null);
  const subtraction = sample("g3-add-sub", (question) => question.prompt.includes("−") && question.walk != null);
  const multiplication = sample("g3-mult", (question) => question.walk != null);
  const fraction = sample("g3-fractions", (question) => question.walk != null);
  const time = sample("g3-time", (question) => question.walk != null);

  it.each([
    ["addition with regrouping", addition, "base-ten"],
    ["subtraction with regrouping", subtraction, "base-ten"],
    ["multiplication", multiplication, "array"],
    ["fractions on a number line", fraction, "number-line"],
    ["telling time", time, "clock"],
  ] as const)("keeps every %s target in the question and the generator answer", (_label, question, visual) => {
    const walk = question.walk;
    expect(walk).not.toBeNull();
    if (!walk) return;
    expect(walk.steps.length).toBeGreaterThanOrEqual(3);
    expect(walk.steps.length).toBeLessThanOrEqual(5);
    expect(walk.answer).toBe(question.answer);
    expect(walk.steps.some((step) => step.visual?.kind === visual)).toBe(true);

    walk.steps.forEach((step, index) => {
      expect(step.caption.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
      expect(step.caption).not.toContain(question.answer);
      expect(targetSpan(question.prompt, step.target, step.occurrence ?? 0)).not.toBeNull();
      const html = renderWalk(question, index);
      expect(html).toContain(`data-walk-target="${step.target}"`);
      expect(html).toContain(step.caption);
      expect(html).toContain(`Step ${index + 1} of ${walk.steps.length}`);
      expect(html).toContain("Next step");
      expect(html).not.toContain("The answer is");
      expect(html).not.toContain("Here's how.");
    });
  });

  it("hides the walkthrough when a skill has no step spec", () => {
    const question = generateQuestion("g3-place", mulberry32(4));
    expect(question.walk).toBeNull();
    const html = renderToStaticMarkup(
      createElement(QuestionPractice, {
        questionId: "place",
        eyebrow: "Focus · Place value",
        prompt: question.prompt,
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: "Look at the place.",
        example: null,
        progress: null,
        phase: "revealed",
        why: null,
        steps: question.steps,
        expected: question.answer,
        walk: null,
      }),
    );
    expect(html).toContain("Here&#x27;s how.");
    expect(html).toContain("The answer is");
    expect(html).not.toContain('class="show-me"');
    expect(html).not.toContain(">Show me<");
  });

  it("shows the help row, one hint, and the your-turn handoff", () => {
    const help = renderToStaticMarkup(
      createElement(QuestionPractice, {
        questionId: "help",
        eyebrow: "Focus · Addition",
        prompt: addition.prompt,
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: "Add the ones first.",
        example: { prompt: "20 + 15 = ?", steps: ["Add the ones."], answer: "35" },
        progress: { index: 1, total: 10 },
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        walk: addition.walk,
      }),
    );
    expect(help).toContain("Help me with this");
    expect(help).toContain(">Show me<");
    expect(help).toContain(">Check<");
    expect(help).not.toContain("Add the ones first.");
    expect(help).not.toContain('class="show-me"');

    const hint = renderToStaticMarkup(
      createElement(QuestionPractice, {
        questionId: "hint",
        eyebrow: "Focus · Addition",
        prompt: addition.prompt,
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: "Add the ones first.",
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        walk: addition.walk,
        walkStart: { step: 0, hint: true },
      }),
    );
    expect(hint).toContain("Add the ones first.");
    expect(hint).toContain("hint-bulb");
    expect(hint).not.toContain('class="show-me"');

    const handoff = renderWalk(addition, 0, true);
    expect(handoff).toContain("Your turn: try one like it");
    expect(handoff).toContain('value="your-turn"');
    expect(handoff).not.toContain(`>${addition.answer}<`);
  });

  it("stores the walked question as not a first try", () => {
    const opened = reduceFeedback(freshFeedback(), { type: "show-me" });
    expect(opened.record).toBe(false);
    expect(opened.state.firstTryCorrect).toBe(false);

    const packed = packStoredAnswer(addition.answer, addition.steps, { walk: addition.walk });
    const marked = withAttemptMark(packed, {
      phase: "revealed",
      firstTryCorrect: false,
      given: "",
      showedHow: true,
    });
    expect(readStoredWalk(marked)?.answer).toBe(addition.answer);
    expect(marked).toContain('"firstTryCorrect":false');

    const cleared = reduceFeedback(opened.state, { type: "next" });
    const follow = reduceFeedback(cleared.state, { type: "check", correct: true });
    expect(follow.record).toBe(true);
    expect(follow.state.firstTryCorrect).toBe(true);

    const next = sample("g3-add-sub", (question) => question.prompt !== addition.prompt && question.prompt.includes("+"));
    expect(next.prompt).not.toBe(addition.prompt);
    expect(next.answer).not.toBe("");
  });

  it("describes walkthrough use without a new event kind", () => {
    expect(showMeUseLine(0)).toBeNull();
    expect(showMeUseLine(1)).toBe("Used Show me on 1 question");
    expect(showMeUseLine(3)).toBe("Used Show me on 3 questions");
  });
});
