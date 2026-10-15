import { describe, expect, it } from "vitest";
import { isSimpleDesk } from "@/lib/dashboard/desk";

describe("desk layout", () => {
  it("stays short through Grade 3 and opens the full breakdown at Grade 4", () => {
    expect(isSimpleDesk(1)).toBe(true);
    expect(isSimpleDesk(3)).toBe(true);
    expect(isSimpleDesk(4)).toBe(false);
    expect(isSimpleDesk(8)).toBe(false);
  });
});
