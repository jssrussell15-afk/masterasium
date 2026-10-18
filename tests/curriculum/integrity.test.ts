import { writeFileSync } from "node:fs";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
      React.createElement("a", { href: typeof href === "string" ? href : String(href), ...props }, children),
  };
});

vi.mock("@/components/sample-request", () => ({
  SampleRequest: () => null,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => (globalThis as { __PATHNAME__?: string }).__PATHNAME__ ?? "/",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

import { getCatalog } from "@/lib/curriculum/catalog";
import { markdownReport, runCurriculumChecks } from "./checks";

beforeAll(() => {
  getCatalog();
});

describe("curriculum integrity", () => {
  it("passes checks 1-10 and writes qa-report.md", () => {
    const report = runCurriculumChecks();
    writeFileSync(new URL("../../qa-report.md", import.meta.url), report.markdown);
    console.log(report.markdown);
    const failed = report.checks.filter((check) => check.status !== "pass");
    expect(failed.map((check) => `${check.id}:${check.failures.slice(0, 5).join(",")}`)).toEqual([]);
  });

  it("fails checks 3 and 4 when one BC standard is marked official", () => {
    const catalog = structuredClone(getCatalog());
    const target = catalog.standards.find((standard) => standard.docKey === "BC-MATH-K9-2016");
    expect(target).toBeTruthy();
    target!.codeType = "official";
    const report = runCurriculumChecks(catalog, { includeHtml: false });
    const check3 = report.checks.find((check) => check.id === "3");
    const check4 = report.checks.find((check) => check.id === "4");
    expect(check3?.status).toBe("fail");
    expect(check4?.status).toBe("fail");
    expect(check3?.failures).toContain(target!.id);
    expect(check4?.failures).toContain(target!.id);
    expect(markdownReport(report.checks)).toContain(target!.id);
  });
});
