import { describe, expect, it } from "vitest";
import { readRememberedChildren, rememberChild, writeRememberedChildren } from "@/lib/children/tablet";

const SAM = { id: "4f3a0c2e-6b1d-4a8e-9c70-1d2e3f4a5b6c", firstName: "Sam" };
const ALEX = { id: "8b1d4a2e-6b1d-4a8e-9c70-1d2e3f4a5b6d", firstName: "Alex" };
const JO = { id: "1c2d3e4f-6b1d-4a8e-9c70-1d2e3f4a5b6e", firstName: "Jo" };

describe("tablet children", () => {
  it("reads saved names and skips anything that is not a child", () => {
    const raw = JSON.stringify([
      SAM,
      { id: "not-an-id", firstName: "Nope" },
      { id: ALEX.id, firstName: "---" },
      ALEX,
    ]);
    expect(readRememberedChildren(raw)).toEqual([SAM, ALEX]);
    expect(readRememberedChildren("")).toEqual([]);
    expect(readRememberedChildren("{")).toEqual([]);
  });

  it("updates a saved child and keeps at most two", () => {
    const updated = rememberChild([SAM, ALEX], { ...SAM, firstName: "Sammy" });
    expect(updated.map((child) => child.firstName)).toEqual(["Sammy", "Alex"]);

    const replaced = rememberChild([SAM, ALEX], JO);
    expect(replaced).toEqual([ALEX, JO]);
    expect(readRememberedChildren(writeRememberedChildren(replaced))).toEqual(replaced);
  });
});
