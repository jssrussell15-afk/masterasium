import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StudentDashboard } from "@/components/student-dashboard";
import type { StudentHome } from "@/lib/practice/home";
import { describeCatalog } from "@/lib/practice/scheduler";

const access = { enrolled: 2 as const, working: 2 as const, nextUnlocked: false, requested: null };

function skills() {
  return describeCatalog(access, []).map((skill, index) => {
    if (index === 0) return { ...skill, status: "mastered" as const };
    if (skill.grade === 2 && skill.current) return { ...skill, status: "practicing" as const };
    if (skill.grade === 5) return { ...skill, status: "check" as const };
    return skill;
  });
}

function screen(home: StudentHome) {
  return renderToStaticMarkup(
    createElement(StudentDashboard, {
      childId: "child-1",
      childName: "Sam",
      grade: 2,
      home,
      skills: skills(),
      access,
      requestedGrade: null,
    }),
  );
}

describe("student dashboard", () => {
  it("keeps the three lists on screen even when they are empty", () => {
    const html = screen({ assigned: [], recommended: [], recent: [] });
    expect(html).toContain("Assigned");
    expect(html).toContain("Recommended");
    expect(html).toContain("Recently practiced");
    expect(html).toContain("Nothing else is waiting in this grade.");
    expect(html).toContain("A recommendation will show up here.");
    expect(html).toContain("No practice yet. Start with a recommended skill.");
    expect(html).not.toContain("badge-tree");
    expect(html).not.toContain("streak");
    expect(html).not.toContain("Points");
  });

  it("opens a skill from a list and keeps mastery marks in the full list", () => {
    const html = screen({
      assigned: [{ id: "path", title: "Path skill", grade: 2, note: "Next in this grade" }],
      recommended: [{ id: "next", title: "Useful skill", grade: 2, note: "A useful next step" }],
      recent: [{ id: "old", title: "Earlier skill", grade: 2, note: "Practiced today" }],
    });
    expect(html).toContain("Path skill");
    expect(html).toContain("Next in this grade");
    expect(html).toContain("Useful skill");
    expect(html).toContain("Earlier skill");
    expect(html).toContain("Practiced today");
    expect(html).toContain("skill-tap");
    expect(html).not.toContain("Nothing else is waiting in this grade.");
    const selectorAt = html.indexOf("Choose a topic");
    expect(selectorAt).toBeGreaterThan(-1);
    expect(html.slice(selectorAt)).toContain("mastery-mark");
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
    expect(html).not.toContain("badge-tree");
    expect(html).not.toContain(">Helmet<");
  });
});
