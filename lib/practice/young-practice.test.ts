// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { QuestionPractice } from "@/components/question-practice";
import { CATALOG } from "@/lib/practice/bank";
import { generateQuestion } from "@/lib/practice/generate";
import { isDifferentExample, stepsUseQuestionNumbers } from "@/lib/practice/hint-numbers";
import { resolveInput } from "@/lib/practice/input-type";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function submitButton(html: string): string {
  return html.match(/<button[^>]*question-submit[^>]*>/)?.[0] ?? "";
}

const TYPED = new Set(["text", "spelling"]);

describe("hint steps use the question's numbers", () => {
  it("rejects a counting hint that names a different number", () => {
    expect(stepsUseQuestionNumbers("What number comes just after 1?", ["Count one more than 1.", "1 and one more is 2."])).toBe(
      true,
    );
    expect(stepsUseQuestionNumbers("What number comes just after 1?", ["Count one more than 4.", "4 and one more is 5."])).toBe(
      false,
    );
    expect(
      isDifferentExample("What number comes just after 1?", "What number comes just after 4?", [
        "Count one more than 4.",
        "4 and one more is 5.",
      ]),
    ).toBe(true);
  });

  it.each(CATALOG.map((blueprint) => [blueprint.id, blueprint.grade] as const))(
    "%s help steps stay on that question",
    (skillId) => {
      for (let seed = 0; seed < 12; seed += 1) {
        const question = generateQuestion(skillId, mulberry32(seed * 997 + skillId.length));
        expect(question.steps.length, question.prompt).toBeGreaterThan(0);
        expect(stepsUseQuestionNumbers(question.prompt, question.steps), `${question.prompt} :: ${question.steps.join(" | ")}`).toBe(
          true,
        );
      }
    },
  );
});

describe("grade 1 and 2 answer with choices", () => {
  it.each(CATALOG.filter((blueprint) => blueprint.grade <= 2).map((blueprint) => [blueprint.id, blueprint.grade] as const))(
    "%s shows choices, no text field, and a disabled Check",
    (skillId, grade) => {
      const question = generateQuestion(skillId, mulberry32(grade * 17 + skillId.length));
      const resolved = resolveInput({
        grade,
        prompt: question.prompt,
        answer: question.answer,
        declared: question.inputType,
        choices: question.choices,
        seed: question.prompt,
      });
      const html = renderToStaticMarkup(
        createElement(QuestionPractice, {
          questionId: skillId,
          eyebrow: question.prompt,
          prompt: question.prompt,
          responseHint: null,
          shape: { kind: "single", inputMode: "numeric" },
          hint: question.steps[0] ?? null,
          example: null,
          helpSteps: question.steps,
          progress: { index: 1, total: 10 },
          phase: "answering",
          why: null,
          steps: [],
          expected: null,
          grade,
          inputType: resolved.inputType,
          choices: resolved.choices,
          action: () => undefined,
        }),
      );
      if (TYPED.has(resolved.inputType)) {
        expect(html).toContain('class="answer-input"');
        return;
      }
      expect(resolved.inputType, question.prompt).toBe("choice");
      expect(html).toContain("answer-choice-tile");
      expect(html).toContain("is-young");
      expect(html).not.toContain('class="answer-input"');
      expect(html).not.toContain("number-pad");
      expect(html.toLowerCase()).not.toContain("inputmode=");
      expect(html).toContain(">Check<");
      expect(submitButton(html)).toContain("disabled");
    },
  );
});

const counting = {
  questionId: "count-1",
  eyebrow: "Practice · Counting and number recognition to 20",
  prompt: "What number comes just after 1?",
  responseHint: null,
  shape: { kind: "single" as const, inputMode: "numeric" as const },
  hint: "Count one more than 1.",
  example: {
    prompt: "What number comes just after 4?",
    steps: ["Count one more than 4.", "4 and one more is 5."],
    answer: "5",
  },
  helpSteps: ["Count one more than 1.", "1 and one more is 2."],
  progress: { index: 3, total: 10 },
  phase: "answering" as const,
  why: null,
  steps: [] as string[],
  expected: null,
  grade: 1,
  autoRead: false,
  inputType: "choice" as const,
  choices: ["2", "3", "0", "4"],
  action: () => undefined,
};

function buttonNamed(label: string): HTMLButtonElement {
  const found = [...document.querySelectorAll("button")].find((node) => node.textContent?.trim() === label);
  if (!(found instanceof HTMLButtonElement)) throw new Error(`Missing button ${label}`);
  return found;
}

describe("help sheet", () => {
  let root: Root | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  async function mount(extra: { helpStartsOpen?: boolean; exampleStartsOpen?: boolean } = {}) {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(QuestionPractice, { ...counting, ...extra }));
    });
  }

  it("keeps the choice, disables Check until a pick, and restores that pick after help closes", async () => {
    await mount();
    const check = () => buttonNamed("Check");
    expect(check().disabled).toBe(true);
    expect(document.querySelector("input.answer-input")).toBeNull();
    expect(document.body.textContent).not.toContain("Count one more than 4.");

    await act(async () => {
      buttonNamed("2").click();
    });
    expect(buttonNamed("2").getAttribute("aria-pressed")).toBe("true");
    expect(check().disabled).toBe(false);

    await act(async () => {
      buttonNamed("3").click();
    });
    expect(buttonNamed("2").getAttribute("aria-pressed")).toBe("false");
    expect(buttonNamed("3").getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      buttonNamed("Help me with this").click();
    });
    expect(document.querySelector(".help-sheet")?.textContent).toContain("Count one more than 1.");
    expect(document.querySelector(".help-sheet")?.textContent).toContain("Step 1 of 2");
    expect(document.body.textContent).not.toContain("Count one more than 4.");
    expect(buttonNamed("3").getAttribute("aria-pressed")).toBe("true");

    await act(async () => {
      buttonNamed("Next").click();
    });
    expect(document.querySelector(".help-sheet")?.textContent).toContain("1 and one more is 2.");
    expect(document.querySelector(".help-number-line")).not.toBeNull();

    await act(async () => {
      buttonNamed("Back to my question").click();
    });
    expect(document.querySelector(".help-sheet")).toBeNull();
    expect(buttonNamed("3").getAttribute("aria-pressed")).toBe("true");
    expect(check().disabled).toBe(false);
    expect(document.querySelector("input.answer-input")).toBeNull();
  });

  it("labels a different-number example and shows that question", async () => {
    await mount({ exampleStartsOpen: true });
    const sheet = document.querySelector(".help-sheet");
    expect(sheet?.textContent).toContain("A similar question");
    expect(sheet?.textContent).toContain("What number comes just after 4?");
    expect(sheet?.textContent).toContain("Count one more than 4.");
    expect(document.querySelector(".answer-choice-tile")).not.toBeNull();
    expect(buttonNamed("2").getAttribute("aria-pressed")).toBe("false");
  });
});
