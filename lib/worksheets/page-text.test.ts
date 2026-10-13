import { describe, expect, it } from "vitest";
import { presentPageText, UNREADABLE_PAGE_MESSAGE } from "@/lib/worksheets/page-text";

describe("printed page text", () => {
  it("keeps a worksheet reading and its line breaks", () => {
    const result = presentPageText("  1. 8 + 5 = ?  \n\n\n2. 12 - 4 = ?  ");
    expect(result).toEqual({ ok: true, text: "1. 8 + 5 = ?\n\n2. 12 - 4 = ?" });
  });

  it("asks for a clearer photo when the reading is empty or very short", () => {
    expect(presentPageText("")).toEqual({ ok: false, message: UNREADABLE_PAGE_MESSAGE });
    expect(presentPageText("   \n  ")).toEqual({ ok: false, message: UNREADABLE_PAGE_MESSAGE });
    expect(presentPageText("8 + 5")).toEqual({ ok: false, message: UNREADABLE_PAGE_MESSAGE });
  });
});
