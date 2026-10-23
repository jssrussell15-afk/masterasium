import { createElement, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { QuestionPractice } from "@/components/question-practice";
import { workedExamplePool } from "@/lib/practice/example-pool";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost/preview/practice",
  });
  const window = dom.window;
  const globals = globalThis as typeof globalThis & Record<string, unknown>;
  for (const [key, value] of Object.entries({
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    Node: window.Node,
    navigator: window.navigator,
    Element: window.Element,
    SVGElement: window.SVGElement,
    getComputedStyle: window.getComputedStyle.bind(window),
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    Object.defineProperty(globals, key, { value, configurable: true, writable: true });
  }
  class SpeechUtterance {
    text = "";
    lang = "";
    rate: number | undefined = undefined;
    onboundary: ((event: { name?: string; charIndex?: number }) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  const heard: SpeechUtterance[] = [];
  const speech = {
    heard,
    cancel() {},
    speak(utterance: SpeechUtterance) {
      heard.push(utterance);
    },
  };
  Object.defineProperty(window, "speechSynthesis", { value: speech, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: SpeechUtterance, configurable: true });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { value: SpeechUtterance, configurable: true });
  Object.defineProperty(globalThis, "speechSynthesis", { value: speech, configurable: true });
  return { window, speech };
}

async function render(node: ReactNode) {
  const { window, speech } = installDom();
  const root: Root = createRoot(window.document.getElementById("root")!);
  await act(async () => {
    root.render(node);
  });
  return { window, root, speech };
}

function click(window: ReturnType<typeof installDom>["window"], selector: string) {
  const node = window.document.querySelector(selector);
  if (!(node instanceof window.HTMLElement)) throw new Error(`Missing ${selector}`);
  node.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
}

describe("worked example panel", () => {
  const pool = workedExamplePool({
    skillId: "g1-add-10",
    livePrompt: "9 + 1 = ?",
    liveAnswer: "10",
  });

  it("reads one step at a time and returns to the unanswered question", async () => {
    const intents: string[] = [];
    const { window, root, speech } = await render(
      createElement(QuestionPractice, {
        questionId: "add",
        eyebrow: "Focus · Addition within 10",
        prompt: "9 + 1 = ?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: "Start at 9 and count on 1.",
        example: pool[0],
        examples: pool,
        skillId: "g1-add-10",
        progress: { index: 1, total: 10 },
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        grade: 1,
        autoRead: true,
        inputType: "number",
        action: (formData) => {
          intents.push(String(formData.get("intent") ?? ""));
        },
      }),
    );

    expect(window.document.body.textContent).toContain("Show me an example");
    expect(window.document.body.textContent).not.toContain(pool[0].prompt);
    await act(async () => {
      click(window, "button.help-target:last-of-type");
    });
    const open = window.document.querySelector(".worked-example-panel");
    expect(open?.textContent).toContain(pool[0].prompt);
    expect(open?.textContent).toContain(pool[0].steps[0]);
    expect(open?.textContent).not.toContain(pool[0].steps[1]);
    expect(open?.textContent).toContain("Next step");
    expect(window.document.querySelector(".example-visual")).not.toBeNull();
    expect(window.document.querySelector(".question-form")).toBeNull();
    expect(window.document.querySelector('input[name="openedExample"]')).toBeNull();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(speech.heard.map((utterance) => utterance.text)).toContain(pool[0].steps[0]);

    await act(async () => {
      click(window, ".worked-example-panel .show-me-next");
    });
    expect(window.document.querySelector(".worked-example-panel")?.textContent).toContain(pool[0].steps[1]);
    expect(window.document.body.textContent).toContain("9 + 1 = ?");
    expect(intents).toEqual([]);

    const last = pool[0].steps.length - 1;
    for (let index = 1; index < last; index += 1) {
      await act(async () => {
        click(window, ".worked-example-panel .show-me-next");
      });
    }
    expect(window.document.body.textContent).toContain("Back to my question");
    await act(async () => {
      click(window, ".worked-example-panel .show-me-next");
    });
    expect(window.document.querySelector(".worked-example-panel")).toBeNull();
    expect(window.document.body.textContent).toContain("9 + 1 = ?");
    expect(window.document.body.textContent).toContain("Check");
    expect(window.document.querySelector('input[name="openedExample"]')?.getAttribute("value")).toBe("0");
    expect(intents).toEqual([]);
    await act(async () => root.unmount());
  });

  it("shows a new example only after the ones already seen", async () => {
    const { window, root } = await render(
      createElement(QuestionPractice, {
        questionId: "add-2",
        eyebrow: "Focus · Addition within 10",
        prompt: "9 + 1 = ?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: pool[0],
        examples: pool,
        skillId: "g1-add-10",
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        grade: 1,
        inputType: "number",
        action: () => undefined,
      }),
    );
    await act(async () => {
      click(window, "button.help-target:last-of-type");
    });
    expect(window.document.body.textContent).toContain(pool[0].prompt);
    await act(async () => {
      const buttons = [...window.document.querySelectorAll("button.help-target")];
      buttons.at(-1)?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(window.document.body.textContent).toContain(pool[1].prompt);
    expect(window.document.body.textContent).not.toContain(pool[0].prompt);
    await act(async () => root.unmount());
  });
});
