import { describe, expect, it } from "vitest";
import { classifyPageFile } from "@/lib/worksheets/page-scan";

describe("page scan upload", () => {
  it("accepts a jpeg, a png, and a pdf", () => {
    expect(classifyPageFile({ name: "page.jpg", type: "image/jpeg", size: 1200 })).toEqual({ kind: "image" });
    expect(classifyPageFile({ name: "page.PNG", type: "", size: 1200 })).toEqual({ kind: "image" });
    expect(classifyPageFile({ name: "sheet.pdf", type: "application/pdf", size: 5000 })).toEqual({ kind: "pdf" });
    expect(classifyPageFile({ name: "scan.pdf", type: "application/octet-stream", size: 5000 })).toEqual({
      kind: "pdf",
    });
  });

  it("rejects a photo the page cannot store yet", () => {
    expect(classifyPageFile({ name: "page.heic", type: "image/heic", size: 1200 })).toEqual({
      error: "Use a JPG, PNG, or PDF.",
    });
    expect(classifyPageFile({ name: "notes.txt", type: "text/plain", size: 20 })).toEqual({
      error: "Use a JPG, PNG, or PDF.",
    });
    const empty = classifyPageFile({ name: "empty.jpg", type: "image/jpeg", size: 0 });
    const huge = classifyPageFile({ name: "huge.jpg", type: "image/jpeg", size: 26 * 1024 * 1024 });
    expect("error" in empty && empty.error).toMatch(/empty/i);
    expect("error" in huge && huge.error).toMatch(/too large/i);
  });
});
