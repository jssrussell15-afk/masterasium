import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticeSession } from "@/components/practice-session";
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
      shape: { kind: "single" },
      assist: null,
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
    expect(html).toContain("Give me a hint");
    expect(html).toContain("Show me an example");
    expect(html).toContain("I give up");
    expect(html).toContain(">Check<");
    expect(html).toContain("All skills");
    expect(html).toContain("hint-dock");
    expect(html).not.toContain("Choose a topic");
    expect(html).not.toContain("mastery-mark");
    expect(html).not.toContain("badge-tree");
    expect(html).not.toContain("streak");
    expect(html).not.toContain("Points");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("Scratchpad");
    expect(html).not.toContain(">Notes<");
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
    const introAt = html.indexOf('aria-label="Topic introduction"');
    const timerAt = html.indexOf("Practice starts in");
    expect(introAt).toBeGreaterThan(-1);
    expect(timerAt).toBeGreaterThan(introAt);
    const card = html.slice(introAt, timerAt);
    expect(card).toContain("Quick intro coming soon");
    expect(card).toContain("4 + 3 = ?");
    expect(card).not.toContain("<button");
    expect(card.toLowerCase()).not.toContain("skip");
    expect(html).toContain("Practice starts in 10 seconds.");
    expect(html).not.toContain("9 + 1 = ?");
    expect(html).not.toContain(">Check<");
    expect(html).not.toContain("Give me a hint");
    expect(html).not.toContain("hint-dock");
  });
});
