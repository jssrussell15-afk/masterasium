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

describe("practice accessibility", () => {
  it("keeps the keypad in the tab order and uses a 48px tap size", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const tokens = readFileSync("app/tokens.css", "utf8");
    expect(tokens).toContain("--tap: 48px");
    expect(css).toMatch(/\.number-pad\s*\{[^}]*display:\s*grid/);
    expect(css).not.toMatch(/\.number-pad\s*\{[^}]*display:\s*none/);
    expect(css).toContain("min-height: 48px");
  });

  it("names the practice controls and keeps the speaker available", async () => {
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
    expect(html).toContain("Read the question");
    expect(html).toContain("Read the hint");
    expect(html).toContain("Read the feedback");
    expect(html).toContain("Digit 5");
    expect(html).toContain('aria-label="Number keypad"');
    const results = await axe.run(window.document.body, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations).toEqual([]);
    await act(async () => root.unmount());
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
    expect(intro.window.document.body.innerHTML).toContain("Read the introduction");
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
