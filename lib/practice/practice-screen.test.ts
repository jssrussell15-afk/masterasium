import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PracticeSession } from "@/components/practice-session";
import { INTRO_PLACEHOLDER, type SkillIntro } from "@/lib/practice/intro-view";
import { describeCatalog } from "@/lib/practice/scheduler";
import type { PracticeView } from "@/lib/practice/types";

function view(): PracticeView {
  const skills = describeCatalog({ working: 2 }, []).map((skill, index) => {
    if (index === 0) return { ...skill, status: "mastered" as const, grade: skill.grade };
    if (skill.grade === 2 && skill.current) return { ...skill, status: "practicing" as const };
    if (skill.id.endsWith("check") || skill.status === "check") return skill;
    if (skill.grade === 5) return { ...skill, status: "check" as const };
    return skill;
  });
  const current = skills.find((skill) => skill.current) ?? skills[0];
  return {
    childId: "child-1",
    childName: "Sam",
    grade: 2,
    access: { enrolled: 2, working: 2, nextUnlocked: false, requested: null },
    question: {
      questionId: "q1",
      prompt: "What is 4 + 5?",
      skillId: current.id,
      skillTitle: current.title,
      responseHint: null,
      kind: "focus",
      shape: { kind: "single" },
      assist: null,
    },
    attempted: 0,
    correct: 0,
    focusTitle: current.title,
    skills,
    streakDays: 0,
    streakMilestone: null,
    recap: null,
    requestedGrade: null,
    today: "2026-10-14",
  };
}

describe("practice question screen", () => {
  it("keeps badges off the question and marks every skill in the selector", () => {
    const html = renderToStaticMarkup(createElement(PracticeSession, { view: view() }));
    const questionAt = html.indexOf("What is 4 + 5?");
    const selectorAt = html.indexOf("Choose a topic");
    expect(selectorAt).toBeGreaterThan(-1);
    expect(questionAt).toBeGreaterThan(selectorAt);
    expect(html.slice(selectorAt, questionAt)).toContain("mastery-mark");
    expect(html.slice(questionAt)).not.toContain("mastery-mark");
    expect(html.slice(questionAt)).not.toContain("badge-tree");
    expect(html).not.toContain("badge-tree");
    expect(html).not.toContain(">Helmet<");
    expect(html).toContain("mastery-mark mastered");
    expect(html).toContain("mastery-mark in-progress");
    expect(html).toContain("mastery-mark not-started");
    expect(html).toContain("Mastered");
    expect(html).toContain("In progress");
    expect(html).toContain("Not started");
    for (const grade of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(html).toContain(`Grade ${grade}`);
    }
    expect(html).toContain("Visible without finishing the earlier grade");
    expect(html).toContain("Working in this grade");
    expect(html).toContain(">Check<");
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
    expect(html).toContain("disabled");
  });
});
