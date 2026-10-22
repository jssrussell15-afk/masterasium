import { readFileSync } from "node:fs";
import { createElement, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { ListenPassage } from "@/components/listen";
import { QuestionPractice } from "@/components/question-practice";
import { READ_ALOUD_HELP, READ_ALOUD_LABEL, readsAloudAutomatically } from "@/lib/children/read-aloud";
import { practiceChoices } from "@/lib/practice/choices";

type Utterance = {
  text: string;
  lang: string;
  onboundary: ((event: { name?: string; charIndex?: number }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    pretendToBeVisual: true,
    url: "http://localhost",
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
    onboundary: Utterance["onboundary"] = null;
    onend: Utterance["onend"] = null;
    onerror: Utterance["onerror"] = null;
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

describe("Listen button", () => {
  it("switches between Listen and Stop at one width and highlights the spoken word", async () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.listen\s*\{[^}]*width:\s*7\.75rem/);
    expect(css).toMatch(/\.listen\s*\{[^}]*border:\s*2px solid/);
    expect(css).toMatch(/\.listen\s*\{[^}]*font-weight:\s*650/);
    expect(css).toMatch(/\.listen-word\s*\{[^}]*background:\s*#d3ebf7/);
    expect(css).not.toMatch(/\.listen-word\s*\{[^}]*animation/);

    const { window, root, speech } = await render(
      createElement(ListenPassage, { parts: [{ text: "Add the ones first", as: "p" }] }),
    );
    const button = window.document.querySelector("button.listen");
    expect(button?.textContent).toContain("Listen");
    expect(button?.querySelector("path")).not.toBeNull();
    expect(button?.querySelector("rect")).toBeNull();
    expect(button?.className).toBe("listen");

    const heard: Utterance[] = [];
    speech.speak = (next: Utterance) => {
      heard.push(next);
      next.onboundary?.({ name: "word", charIndex: next.text.indexOf("ones") });
    };
    await act(async () => {
      button?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(heard[0]?.text).toBe("Add the ones first");
    expect(heard[0]?.lang).toBe("en-CA");
    expect(button?.textContent).toContain("Stop");
    expect(button?.querySelector("rect")).not.toBeNull();
    expect(button?.className).toBe("listen");
    const marked = [...window.document.querySelectorAll(".listen-word")].map((node) => node.textContent);
    expect(marked).toEqual(["ones"]);
    await act(async () => root.unmount());
  });

  it("still reads when boundary events never arrive", async () => {
    const { window, root, speech } = await render(
      createElement(ListenPassage, { parts: [{ text: "Add the ones", as: "p" }] }),
    );
    const heard: string[] = [];
    speech.speak = (utterance: Utterance) => {
      heard.push(utterance.text);
    };
    await act(async () => {
      window.document.querySelector("button.listen")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(heard).toEqual(["Add the ones"]);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 320));
    });
    const marked = [...window.document.querySelectorAll(".listen-word")].map((node) => node.textContent);
    expect(marked).toEqual([]);
    expect(window.document.querySelector("button.listen")?.textContent).toContain("Stop");
    await act(async () => root.unmount());
  });

  it("marks only the word currently being spoken", async () => {
    const { window, root, speech } = await render(
      createElement(ListenPassage, { parts: [{ text: "Add the ones first.", as: "p" }] }),
    );
    let utterance: Utterance | null = null;
    speech.speak = (next: Utterance) => {
      utterance = next;
    };
    await act(async () => {
      window.document.querySelector("button.listen")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    const spoken = utterance as Utterance | null;
    expect(spoken?.text).toBe("Add the ones first.");
    const words = ["Add", "the", "ones", "first."];
    for (const word of words) {
      await act(async () => {
        spoken?.onboundary?.({ name: "word", charIndex: spoken.text.indexOf(word) });
      });
      const marked = [...window.document.querySelectorAll(".listen-word")].map((node) => node.textContent);
      expect(marked).toEqual([word]);
    }
    await act(async () => root.unmount());
  });
});

describe("grade listen behaviour", () => {
  it("reads Grade 1 questions automatically and puts a Listen pill beside each choice", async () => {
    const { window, root, speech } = await render(
      createElement(QuestionPractice, {
        questionId: "g1",
        eyebrow: "Focus · Addition within 10",
        prompt: "6 + 2 = ?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        grade: 1,
        autoRead: true,
        inputType: "choice",
        choices: ["8", "7", "6"],
        action: () => undefined,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(speech.heard.map((utterance) => utterance.text)).toContain("6 + 2 = ?");
    const pills = [...window.document.querySelectorAll("button.listen-choice")];
    expect(pills).toHaveLength(3);
    for (const pill of pills) {
      expect(pill.closest(".answer-choice-tile")).toBeNull();
      expect(pill.parentElement?.querySelector(".answer-choice-tile")).not.toBeNull();
      expect(pill.textContent).toContain("Listen");
    }
    expect(window.document.querySelectorAll(".answer-choice-tile")).toHaveLength(3);
    await act(async () => root.unmount());
  });

  it("reads a Grade 1 Show me caption from the caption bar at a slower rate", async () => {
    const walk = {
      answer: "9",
      steps: [
        { target: "4", caption: "Start with four" },
        { target: "5", caption: "Count on five" },
        { target: "?", caption: "Type the sum." },
      ],
    };
    const { window, root, speech } = await render(
      createElement(QuestionPractice, {
        questionId: "g1-walk",
        eyebrow: "Focus · Addition within 10",
        prompt: "4 + 5 = ?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        grade: 1,
        autoRead: true,
        walk,
        walkStart: { step: 0 },
        action: () => undefined,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(window.document.querySelectorAll("button.listen")).toHaveLength(1);
    expect(speech.heard.map((utterance) => utterance.text)).toContain("Start with four");
    expect(speech.heard[0]?.rate).toBe(0.85);
    expect(speech.heard[0]?.lang).toBe("en-CA");
    await act(async () => root.unmount());
  });

  it("gives Grade 3 choices no Listen buttons and does not auto-read", async () => {
    const { window, root, speech } = await render(
      createElement(QuestionPractice, {
        questionId: "g3",
        eyebrow: "Focus · Addition",
        prompt: "47 + 25 = ?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        grade: 3,
        autoRead: false,
        choices: ["72", "62", "71"],
        action: () => undefined,
      }),
    );
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(speech.heard).toEqual([]);
    expect(window.document.querySelectorAll("button.listen-choice")).toHaveLength(0);
    expect(window.document.querySelectorAll(".answer-choice-tile")).toHaveLength(3);
    expect(window.document.querySelectorAll("button.listen")).toHaveLength(1);
    await act(async () => root.unmount());
  });

  it("reads the spelling word and leaves it off the prompt", async () => {
    const { window, root, speech } = await render(
      createElement(QuestionPractice, {
        questionId: "spell",
        eyebrow: "Spelling",
        prompt: "Spell the word you hear.",
        responseHint: null,
        shape: { kind: "single", inputMode: "text" },
        hint: null,
        example: null,
        progress: null,
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
        grade: 2,
        autoRead: false,
        inputType: "spelling",
        speak: "kitten",
        action: () => undefined,
      }),
    );
    expect(window.document.body.textContent).toContain("Spell the word you hear.");
    expect(window.document.body.textContent).not.toContain("kitten");
    expect(window.document.querySelector(".number-pad")).toBeNull();
    await act(async () => {
      window.document.querySelector("button.listen")?.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    });
    expect(speech.heard.map((utterance) => utterance.text)).toContain("kitten");
    await act(async () => root.unmount());
  });
});

describe("read aloud setting", () => {
  it("defaults on for Grades 1–2 and off otherwise", () => {
    expect(readsAloudAutomatically(1, null)).toBe(true);
    expect(readsAloudAutomatically(2, undefined)).toBe(true);
    expect(readsAloudAutomatically(3, null)).toBe(false);
    expect(readsAloudAutomatically(1, false)).toBe(false);
    expect(readsAloudAutomatically(4, true)).toBe(true);
    expect(READ_ALOUD_LABEL).toBe("Read questions aloud automatically");
    expect(READ_ALOUD_HELP).toBe("On by default for Grades 1–2. Kids can always tap Listen.");
  });

  it("builds Grade 1 choices and skips Grade 3", () => {
    const early = practiceChoices(1, "6 + 2 = ?", "8", "q");
    expect(early).toContain("8");
    expect(early?.length).toBe(3);
    expect(practiceChoices(1, "Which number is greater, 9 or 14?", "14", "q")?.slice().sort()).toEqual(["14", "9"]);
    expect(practiceChoices(3, "47 + 25 = ?", "72", "q")).toBeNull();
  });
});
