import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import axe from "axe-core";
import { describe, expect, it } from "vitest";
import { IntroModal } from "@/components/intro-modal";
import { QuestionPractice } from "@/components/question-practice";
import { StudentLoginForm } from "@/components/student-login-form";

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost",
  });
  const window = dom.window;
  const globals = globalThis as typeof globalThis & {
    window: typeof window;
    document: Document;
    HTMLElement: typeof HTMLElement;
    Node: typeof Node;
    navigator: Navigator;
    Element: typeof Element;
    SVGElement: typeof SVGElement;
    getComputedStyle: typeof getComputedStyle;
    IS_REACT_ACT_ENVIRONMENT: boolean;
  };
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
  class Utterance {
    text = "";
    lang = "";
    rate: number | undefined;
    onboundary: ((event: { name?: string; charIndex?: number }) => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  const speech = { cancel() {}, speak() {} };
  Object.defineProperty(window, "speechSynthesis", { value: speech, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", { value: Utterance, configurable: true });
  Object.defineProperty(globalThis, "speechSynthesis", { value: speech, configurable: true });
  if (window.HTMLDialogElement) {
    window.HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true;
    };
    window.HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.open = false;
    };
  }
  return window;
}

async function render(node: ReactNode) {
  const window = installDom();
  const root: Root = createRoot(window.document.getElementById("root")!);
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { window, root };
}

const walk = {
  answer: "9",
  steps: [
    { target: "4", caption: "Start with four" },
    { target: "+", caption: "Add the next" },
    { target: "5", caption: "Count the rest" },
  ],
};

describe("practice accessibility", () => {
  it("keeps the keypad in the tab order and uses a 48px tap size", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tokens = readFileSync("app/tokens.css", "utf8");
    expect(tokens).toContain("--tap: 48px");
    expect(css).toMatch(/\.number-pad\s*\{[^}]*display:\s*grid/);
    const finePointer = css.match(/@media \(hover: hover\) and \(pointer: fine\)\s*\{([\s\S]*?)\n\}/);
    expect(finePointer?.[1] ?? "").toMatch(/\.question-form \.number-pad[\s\S]*display:\s*none/);
    const withoutFinePointer = css.replace(/@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\n\}/, "");
    expect(withoutFinePointer).not.toMatch(/\.number-pad\s*\{[^}]*display:\s*none/);
    expect(css).toContain("min-height: 48px");
    expect(css).toMatch(/\.listen\s*\{[^}]*min-height:\s*var\(--tap\)/);
    expect(css).toContain("#d3ebf7");
  });

  it("names the practice controls and keeps one Listen button", async () => {
    const { window, root } = await render(
      createElement(QuestionPractice, {
        questionId: "q1",
        eyebrow: "Focus · Add within 20",
        prompt: "What is 4 + 5?",
        responseHint: "Write one number.",
        shape: { kind: "single", inputMode: "numeric" },
        hint: "Start at 4 and count on.",
        example: null,
        progress: { index: 1, total: 10 },
        phase: "retry",
        why: null,
        steps: [],
        expected: null,
        draft: "3",
        action: () => undefined,
      }),
    );
    const html = window.document.body.innerHTML;
    const listens = [...window.document.querySelectorAll("button.listen")];
    expect(listens).toHaveLength(1);
    expect(listens[0]?.textContent).toContain("Listen");
    expect(html).not.toContain(">Speak<");
    expect(html).toContain("Write one number.");
    expect(html).toContain("Start at 4 and count on.");
    expect(html).toContain("Digit 5");
    expect(html).toContain('aria-label="Number keypad"');
    const results = await axe.run(window.document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
    await act(async () => root.unmount());
  });

  it("reads the open Show me step from one Listen button in the caption bar", async () => {
    const spoken: { text: string; lang: string; rate?: number }[] = [];
    const { window, root } = await render(
      createElement(QuestionPractice, {
        questionId: "walk-1",
        eyebrow: "Focus · Add within 20",
        prompt: "What is 4 + 5?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        action: () => undefined,
        walk,
        walkStart: { step: 0 },
      }),
    );
    const buttons = [...window.document.querySelectorAll("button.listen")];
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toContain("Listen");
    expect(window.document.body.innerHTML).toContain("Step 1 of 3");
    expect(window.document.body.innerHTML).toContain(">Back<");
    expect(window.document.body.innerHTML).toContain(">Next<");
    expect(window.document.body.innerHTML).not.toContain(">Speak<");
    window.speechSynthesis.speak = (utterance: { text: string; lang: string; rate?: number }) => {
      spoken.push(utterance);
    };
    await act(async () => {
      buttons[0]?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(spoken[0]?.text).toBe("Start with four");
    expect(spoken[0]?.lang).toBe("en-CA");
    expect(spoken[0]?.rate).not.toBe(0.92);
    await act(async () => root.unmount());

    const handoff = await render(
      createElement(QuestionPractice, {
        questionId: "walk-2",
        eyebrow: "Focus · Add within 20",
        prompt: "What is 4 + 5?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        action: () => undefined,
        walk,
        walkStart: { step: 2, handoff: true },
      }),
    );
    const turn = handoff.window.document.querySelector("button.listen");
    const heard: { text: string; lang: string }[] = [];
    handoff.window.speechSynthesis.speak = (utterance: { text: string; lang: string }) => {
      heard.push(utterance);
    };
    await act(async () => {
      turn?.dispatchEvent(new handoff.window.MouseEvent("click", { bubbles: true }));
    });
    expect(handoff.window.document.body.textContent).toContain("Your turn: try one like it");
    expect(heard[0]?.text).toBe("Your turn: try one like it");
    expect(heard[0]?.lang).toBe("en-CA");
    expect(handoff.window.document.querySelectorAll("button.listen")).toHaveLength(1);
    await act(async () => handoff.root.unmount());
  });

  it("names the intro card and the sign-in pad", async () => {
    const intro = await render(
      createElement(IntroModal, {
        title: "Add within 20",
        sentences: ["Put the numbers together."],
        example: { prompt: "4 + 3 = ?", steps: ["Count on 3."], answer: "7" },
        onFinished: () => undefined,
        onViewed: () => undefined,
      }),
    );
    const listens = intro.window.document.querySelectorAll("button.listen");
    expect(listens).toHaveLength(1);
    expect(listens[0]?.textContent).toContain("Listen");
    expect(intro.window.document.body.innerHTML).toContain(">Start<");
    const introResults = await axe.run(intro.window.document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(introResults.violations).toEqual([]);
    await act(async () => intro.root.unmount());

    const signIn = await render(
      createElement(StudentLoginForm, {
        students: [{ id: "child-1", firstName: "Sam", pinLength: 4 }],
      }),
    );
    expect(signIn.window.document.body.innerHTML).toContain("Digit 1");
    expect(signIn.window.document.body.innerHTML).toContain('aria-label="Students"');
    const signInResults = await axe.run(signIn.window.document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(signInResults.violations).toEqual([]);
    await act(async () => signIn.root.unmount());
  });
});
