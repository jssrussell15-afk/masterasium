import { describe, expect, it } from "vitest";
import { buildAnswerSheetPdf, buildWorksheetPdf } from "@/lib/worksheets/pdf";
import { EMPTY_HEADER } from "@/lib/worksheets/types";

describe("worksheet pdf", () => {
  it("builds a printable worksheet and a separate answer sheet", async () => {
    const items = [
      { prompt: "5 + 4 = ?", answer: "9", steps: ["5 + 4 = 9."] },
      { prompt: "20 ÷ 4 = ?", answer: "5", steps: ["20 ÷ 4 = 5."] },
    ];
    const worksheet = await buildWorksheetPdf({
      title: "Math practice",
      instructions: "Show your work.",
      subtitle: "Adding within 10",
      gradeLabel: "1",
      header: { ...EMPTY_HEADER, showGrade: true, showScore: true },
      items,
    });
    const answers = await buildAnswerSheetPdf({ title: "Math practice", items });
    expect(Buffer.from(worksheet).subarray(0, 5).toString()).toBe("%PDF-");
    expect(Buffer.from(answers).subarray(0, 5).toString()).toBe("%PDF-");
  });
});
