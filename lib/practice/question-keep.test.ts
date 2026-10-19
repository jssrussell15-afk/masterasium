// @vitest-environment jsdom

import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { QuestionPractice } from "@/components/question-practice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const shared = {
  eyebrow: "Focus · Addition within 10",
  prompt: "6 + 2 = ?",
  responseHint: null,
  shape: { kind: "single" as const, inputMode: "numeric" as const },
  hint: "Start at 6 and count on 2.",
  example: {
    prompt: "4 + 3 = ?",
    steps: ["Start at 4 and count on 3.", "4 + 3 = 7."],
    answer: "7",
  },
  progress: { index: 1, total: 10 },
  action: () => undefined,
};

function Host({ questionId, draft }: { questionId: string; draft: string }) {
  return createElement(QuestionPractice, {
    key: questionId,
    ...shared,
    questionId,
    draft,
    phase: "retry",
    why: null,
    steps: [],
    expected: null,
  });
}

function Parent() {
  const [questionId, setQuestionId] = useState("q1");
  const [draft, setDraft] = useState("5");
  const [tick, setTick] = useState(0);
  return createElement(
    "div",
    null,
    createElement(
      "button",
      { type: "button", id: "rerender", onClick: () => setTick((current) => current + 1) },
      String(tick),
    ),
    createElement(
      "button",
      {
        type: "button",
        id: "next-question",
        onClick: () => {
          setQuestionId("q2");
          setDraft("3");
        },
      },
      "Next question",
    ),
    createElement(Host, { questionId, draft }),
  );
}

function answerInput(): HTMLInputElement {
  const input = document.querySelector("input.answer-input");
  if (!(input instanceof HTMLInputElement)) throw new Error("Missing answer field");
  return input;
}

describe("question answer reset", () => {
  let root: Root | null = null;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
  });

  it("keeps a retry draft when the parent re-renders, and resets it for a new question", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(Parent));
    });

    expect(answerInput().value).toBe("5");
    const nine = [...document.querySelectorAll("button")].find((node) => node.textContent === "9");
    if (!(nine instanceof HTMLButtonElement)) throw new Error("Missing digit");
    await act(async () => {
      nine.click();
    });
    expect(answerInput().value).toBe("59");

    await act(async () => {
      document.getElementById("rerender")?.click();
    });
    expect(answerInput().value).toBe("59");

    await act(async () => {
      document.getElementById("next-question")?.click();
    });
    expect(answerInput().value).toBe("3");
  });
});
