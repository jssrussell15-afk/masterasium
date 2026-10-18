import { writeFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionPractice } from "@/components/question-practice";
import { whyPromptsEnabled } from "@/lib/practice/why-flag";
import { runWhyCheck } from "@/lib/practice/why-check";
import { WHY_SKILLS } from "@/lib/practice/why";

describe("why explanation templates", () => {
  const report = runWhyCheck();

  if (process.env.WHY_REPORT === "1") {
    const lines = [
      ...Object.entries(report.counts).map(([id, count]) => `${id} ${count}`),
      ...report.reviews.map((note) => `review: ${note}`),
      report.failures.length === 0 ? "failures 0" : `failures ${report.failures.length}`,
    ];
    writeFileSync("/tmp/why-report.txt", `${lines.join("\n")}\n`);
  }

  it("fills every matching template without a failed check", () => {
    const grouped = new Map<string, Set<string>>();
    for (const failure of report.failures) {
      const bucket = grouped.get(failure.templateId) ?? new Set<string>();
      if (failure.reason.startsWith("choice lengths")) {
        if (![...bucket].some((item) => item.startsWith("length"))) bucket.add(`length ${failure.reason.slice(15, 180)}`);
      } else {
        bucket.add(failure.reason.slice(0, 90));
      }
      grouped.set(failure.templateId, bucket);
    }
    const summary = [...grouped.entries()].map(([id, kinds]) => `${id}: ${[...kinds].join(" || ")}`);
    expect(summary).toEqual([]);
  });

  it("matches every template on many questions", () => {
    for (const skill of WHY_SKILLS) {
      for (const template of skill.templates) {
        expect(report.counts[template.id] ?? 0, template.id).toBeGreaterThanOrEqual(6);
      }
    }
  });

  it("keeps the practice flag off and the prompts off the question card", () => {
    expect(whyPromptsEnabled()).toBe(false);
    const html = renderToStaticMarkup(
      createElement(QuestionPractice, {
        questionId: "q1",
        eyebrow: "Focus",
        prompt: "6 × 6 = ?",
        responseHint: null,
        shape: { kind: "single", inputMode: "numeric" },
        hint: null,
        example: null,
        progress: { index: 1, total: 10 },
        phase: "answering",
        why: null,
        steps: [],
        expected: null,
      }),
    );
    expect(html).not.toContain("why-prompt-slot");
    expect(html).not.toContain("Why does that work?");
    expect(html).not.toContain("Why trade ones");
  });
});
