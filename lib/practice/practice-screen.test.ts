import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticeSession } from "@/components/practice-session";
import { QuestionPractice } from "@/components/question-practice";
import { INTRO_PLACEHOLDER, type SkillIntro } from "@/lib/practice/intro-view";
import type { PracticeView } from "@/lib/practice/types";

function view(grade: 2 | 4 = 2): PracticeView {
  return {
    childId: "child-1",
    childName: "Sam",
    grade,
    access: { enrolled: grade, working: grade, nextUnlocked: false, requested: null },
    question: {
      questionId: "q1",
      prompt: "What is 4 + 5?",
      skillId: "add-within-20",
      skillTitle: "Add within 20",
      responseHint: null,
      kind: "focus",
      shape: { kind: "single", inputMode: "numeric" },
      assist: null,
      hints: { hint: "Start at the first number and count on.", example: "2 + 3 = 5." },
      example: { prompt: "2 + 3 = ?", steps: ["Start at 2 and count on 3.", "2 + 3 = 5."], answer: "5" },
    },
    attempted: 0,
    correct: 0,
    focusTitle: "Add within 20",
    skills: [],
    streakDays: 3,
    streakMilestone: 3,
    recap: "You practiced adding.",
    requestedGrade: null,
    today: "2026-10-14",
  };
}

describe("practice question screen", () => {
  it("shows one question with fixed hint prompts and no rewards", () => {
    const html = renderToStaticMarkup(createElement(PracticeSession, { view: view(2) }));
    expect(html).toContain("What is 4 + 5?");
    expect(html).toContain("Question 1 of 10");
    expect(html).toContain(">Hint<");
    expect(html).toContain("Show me an example");
    expect(html).toContain("Show me how");
    expect(html).toContain(">Check<");
    expect(html).toContain("All skills");
    expect(html).toContain("number-pad");
    expect(html.toLowerCase()).toContain('inputmode="numeric"');
    expect(html).not.toContain("hint-dock");
    expect(html).not.toContain("I give up");
    expect(html).not.toContain("The answer is");
    expect(html).not.toContain("Choose a topic");
    expect(html).not.toContain("mastery-mark");
    expect(html).not.toContain("badge-tree");
    expect(html).not.toContain("streak");
    expect(html).not.toContain("Points");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("Scratchpad");
    expect(html).not.toContain(">Notes<");
  });

  it("keeps a review item unlabeled and readable, with a quiet on-ramp", () => {
    const sample = view();
    const html = renderToStaticMarkup(
      createElement(PracticeSession, {
        view: {
          ...sample,
          question: {
            ...sample.question,
            kind: "review",
            skillTitle: "Fractions as equal parts",
            prompt: "What fraction is shaded?",
            onRamp: {
              line: "Let's try this one together.",
              step: "There are 8 equal parts in the whole.",
              handoff: "Your turn: try one like it.",
            },
          },
        },
      }),
    );
    expect(html).toContain("Fractions as equal parts");
    expect(html).toContain("Let&#x27;s try this one together.");
    expect(html).toContain("Your turn: try one like it.");
    expect(html).toContain("What fraction is shaded?");
    expect(html).toContain('aria-label="Read aloud"');
    expect(html).not.toMatch(/Review today|Review question|>Review<|Review ·/);
    expect(html).not.toMatch(/forgot|demot|Back to grade/i);
    expect(html).not.toContain("Kept fractions");
  });

  it("keeps a notes pad beside the question from grade 4 up", () => {
    const html = renderToStaticMarkup(createElement(PracticeSession, { view: view(4) }));
    expect(html).toContain('aria-label="Scratchpad"');
    expect(html).toContain(">Notes<");
    expect(html).toContain("with-pad");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain('name="notes"');
  });

  it("holds a new skill on a mandatory intro with no skip", () => {
    const sample = view();
    const intro: SkillIntro = {
      skillId: sample.question.skillId,
      cycle: "new",
      seconds: 10,
      style: "visual",
      placeholder: INTRO_PLACEHOLDER,
      asset: null,
      beats: [
        {
          caption: "Put the numbers together.",
          prompt: "4 + 3 = ?",
          answer: "7",
        },
      ],
    };
    const html = renderToStaticMarkup(
      createElement(PracticeSession, {
        view: {
          ...sample,
          question: { ...sample.question, prompt: "9 + 1 = ?", intro },
        },
      }),
    );
    expect(html).toContain('class="intro-dialog"');
    expect(html).toContain(">Add within 20<");
    expect(html).toContain("Put the numbers together.");
    expect(html).toContain("4 + 3 = ?");
    expect(html).toContain("Show answer");
    expect(html).toContain(">Start<");
    expect(html).not.toContain(">7<");
    expect(html).not.toContain("Answer:");
    expect(html.toLowerCase()).not.toContain("skip");
    expect(html).not.toContain("Practice starts in");
    expect(html).not.toContain("Quick intro coming soon");
    expect(html).not.toContain("coming soon");
    expect(html).not.toContain("9 + 1 = ?");
    expect(html).not.toContain(">Check<");
    expect(html).not.toContain("hint-dock");
  });
});

describe("question feedback card", () => {
  const shared = {
    questionId: "q1",
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

  it("keeps a first miss on the same question and shows the hint", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionPractice, {
        ...shared,
        phase: "retry",
        why: null,
        steps: [],
        expected: null,
        draft: "5",
      }),
    );
    expect(html).toContain("Not quite. Try again.");
    expect(html).toContain("Start at 6 and count on 2.");
    expect(html).toContain('value="5"');
    expect(html).toContain(">Check<");
    expect(html).not.toContain(">Next<");
    expect(html).not.toContain("The answer is");
    expect(html).not.toContain("Here's how.");
  });

  it("shows the worked steps after a second miss and waits for Next", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionPractice, {
        ...shared,
        phase: "revealed",
        why: null,
        steps: ["Start at 6 and count on 2.", "6 + 2 = 8."],
        expected: "8",
      }),
    );
    expect(html).toContain("Here&#x27;s how.");
    expect(html).toContain("The answer is");
    expect(html).toContain(">8<");
    expect(html).toContain(">Next<");
    expect(html).not.toContain(">Check<");
    expect(html).not.toContain("Show me how");
  });

  it("shows a calm correct line and a Next button", () => {
    const html = renderToStaticMarkup(
      createElement(QuestionPractice, {
        ...shared,
        phase: "correct",
        why: "Start at 6 and count on 2.",
        steps: [],
        expected: null,
        draft: "8",
      }),
    );
    expect(html).toContain("That&#x27;s right.");
    expect(html).toContain("Start at 6 and count on 2.");
    expect(html).toContain(">Next<");
    expect(html).not.toContain(">Check<");
    expect(html).not.toContain("The answer is");
  });
});
