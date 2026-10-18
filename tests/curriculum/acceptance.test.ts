import { readFileSync } from "node:fs";
import axe from "axe-core";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";

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

import CurriculumNotFound from "@/app/curriculum/[province]/[grade]/not-found";
import { revalidate, generateStaticParams } from "@/app/curriculum/[province]/[grade]/page";
import { rememberSlug } from "@/lib/curriculum/request-slug";
import { SHOW_COMING_SOON_PILLS } from "@/lib/curriculum/config";
import { getCatalog } from "@/lib/curriculum/catalog";
import { currentDocKey } from "@/lib/curriculum/documents";
import { JURISDICTIONS } from "@/lib/curriculum/jurisdictions";
import { parseAlignmentCsv } from "@/lib/curriculum/province-import";
import { STARTER_ALIGNMENTS } from "@/lib/curriculum/starter-alignments";
import {
  gradeHref,
  hasPublishedSequence,
  isGradePublished,
  loadGradePage,
  pillProvinces,
  provinceHref,
  staticCurriculumParams,
} from "@/lib/curriculum/view";
import { renderGrade, renderSwitch, visibleText } from "./checks";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const catalog = getCatalog();

function page(slug: string, grade: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) {
  const loaded = loadGradePage(slug, grade, null);
  if (!loaded) throw new Error(`missing ${slug} grade ${grade}`);
  return loaded;
}

function skillTitles(slug: string, grade: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8) {
  return page(slug, grade)
    .strands.flatMap((strand) => strand.items)
    .filter((item) => item.kind === "skill")
    .map((item) => item.title);
}

describe("section 2 ontario corrections", () => {
  it("counts 369 specific expectations and shows corrected placements", () => {
    const specifics = catalog.standards.filter((standard) => standard.docKey === "ON-MATH-2020" && standard.level === "specific");
    expect(specifics).toHaveLength(369);
    const grade3 = page("ontario", 3);
    const number = grade3.strands.find((strand) => strand.code === "B");
    const numberSkills = number?.items.filter((item) => item.kind === "skill") ?? [];
    expect(numberSkills[0]?.title).toBe("Place value to 1,000");
    const facts = numberSkills.find((item) => item.title.startsWith("Multiplication facts of 2, 5 and 10"));
    expect(facts?.chips.map((chip) => chip.label)).toContain("B2.2");
    expect(skillTitles("ontario", 3).some((title) => title.includes("10×10"))).toBe(false);
    expect(skillTitles("ontario", 3).some((title) => /remainder/i.test(title))).toBe(false);
    const grade4 = skillTitles("ontario", 4);
    expect(grade4).toContain("Multiplication facts to 10×10");
    expect(grade4).toContain("Division with remainders");
    const grade4Number = page("ontario", 4).strands.find((strand) => strand.code === "B");
    const facts4 = grade4Number?.items.find((item) => item.title === "Multiplication facts to 10×10");
    const remainders = grade4Number?.items.find((item) => item.title === "Division with remainders");
    expect(facts4?.chips.map((chip) => chip.code)).toContain("B2.2");
    expect(remainders?.chips.map((chip) => chip.code)).toContain("B2.6");
    expect(grade4).not.toContain("Adding and subtracting fractions with like denominators");
    const fractions = page("ontario", 5).strands.flatMap((strand) => strand.items).find((item) => item.title === "Adding and subtracting fractions with like denominators");
    expect(fractions?.chips.map((chip) => chip.code)).toContain("B2.5");
    expect(skillTitles("ontario", 5).some((title) => title.includes("Volume"))).toBe(false);
    const volume = page("ontario", 7).strands.flatMap((strand) => strand.items).find((item) => item.title === "Volume of prisms and cylinders");
    expect(volume?.chips.map((chip) => chip.code)).toContain("E2.7");
  });

  it("shows strands A-F, a C3 item, and the verbatim B2.5 popover", () => {
    for (let grade = 1; grade <= 8; grade += 1) {
      const loaded = page("ontario", grade as 1);
      expect(loaded.strands.map((strand) => strand.code)).toEqual(["A", "B", "C", "D", "E", "F"]);
      expect(loaded.strands.map((strand) => strand.heading[0])).toEqual(["A", "B", "C", "D", "E", "F"]);
      const algebra = loaded.strands.find((strand) => strand.code === "C");
      expect(algebra?.items.some((item) => item.chips.some((chip) => chip.code.startsWith("C3")) || item.title.startsWith("C3"))).toBe(true);
      expect(loaded.strands.flatMap((strand) => strand.items).filter((item) => item.kind === "skill").every((item) => item.chips.length > 0)).toBe(true);
    }
    const html = renderGrade(page("ontario", 3), "strands");
    expect(visibleText(html)).toContain(
      "represent and solve problems involving the addition and subtraction of whole numbers that add up to no more than 1000, using various tools and algorithms",
    );
    expect(html).toContain('data-testid="last-verified"');
    expect(visibleText(html)).toContain("Curriculum: The Ontario Curriculum, Grades 1-8: Mathematics (2020). Last verified 2026-10-17.");
  });
});

describe("section 3 sequence view", () => {
  it("shows the Grade 3 suggested order and falls back on Grade 5", () => {
    const loaded = page("ontario", 3);
    expect(loaded.sequence?.blocks).toHaveLength(10);
    expect(loaded.sequence?.label).toBe("Suggested by Masterasium");
    expect(loaded.sequence?.disclaimer).toBe(
      "Ontario's curriculum lists expectations by strand and does not set a teaching order. This order is our suggestion, based on how Ontario school boards plan Grade 3: number and operations early, with facts and mental math practised all year. Your teacher's order may differ.",
    );
    const html = renderGrade(loaded, "sequence");
    const text = visibleText(html);
    expect(text).toContain("Suggested by Masterasium");
    expect(text).toContain(loaded.sequence?.disclaimer);
    expect(html.match(/data-testid="sequence-block"/g)).toHaveLength(10);
    expect(loaded.sequence?.blocks[0].main.some((item) => item.title === "Place value to 1,000")).toBe(true);
    expect(loaded.sequence?.blocks[5].main.some((item) => item.title === "Fair shares and equivalent fractions")).toBe(true);
    for (const block of loaded.sequence?.blocks ?? []) {
      expect(block.keepPractising.map((chip) => chip.code)).toContain("B2.3");
      expect(block.keepPractising.map((chip) => chip.code)).toContain("A1");
      if (block.position >= 4) expect(block.keepPractising.map((chip) => chip.code)).toContain("B2.2");
      else expect(block.keepPractising.map((chip) => chip.code)).not.toContain("B2.2");
    }
    const specifics = catalog.standards.filter(
      (standard) => standard.docKey === "ON-MATH-2020" && standard.grade === 3 && standard.level === "specific",
    );
    expect(specifics).toHaveLength(46);
    const covered = new Set(catalog.sequenceItems.map((item) => item.standardId));
    expect(specifics.filter((standard) => !covered.has(standard.id)).map((standard) => standard.code)).toEqual([]);
    expect(page("ontario", 5).sequence).toBeNull();
    expect(hasPublishedSequence("ON", 5)).toBe(false);
    const grade5 = renderGrade(page("ontario", 5), "strands");
    expect(grade5).not.toContain("Suggested order");
    expect(gradeHref("ontario", 3, "sequence")).toBe("/curriculum/ontario/grade-3?view=sequence");
    expect(gradeHref("ontario", 3, null)).toBe("/curriculum/ontario/grade-3");
    expect(html).toContain("Simcoe County DSB Grade 3 Course of Study (Aug 2020)");
    expect(html).toContain("https://andrw.dpcdsb.org/download/519657");
  });
});

describe("section 4 province pills and routing", () => {
  it("renders 12 pills, hides Quebec, and keeps the selected style", () => {
    expect(SHOW_COMING_SOON_PILLS).toBe(true);
    expect(revalidate).toBe(86400);
    const pills = pillProvinces();
    expect(pills.map((item) => item.name)).toEqual([
      "Ontario",
      "British Columbia",
      "Alberta",
      "Saskatchewan",
      "Manitoba",
      "Nova Scotia",
      "Prince Edward Island",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Yukon",
      "Northwest Territories",
      "Nunavut",
    ]);
    expect(pills.some((item) => item.slug === "quebec")).toBe(false);
    const onlyOn = JURISDICTIONS.map((item) => ({
      ...item,
      publishStatus: item.code === "ON" ? ("published" as const) : item.code === "QC" ? ("hidden" as const) : ("coming_soon" as const),
    })).filter((item) => item.publishStatus !== "hidden");
    const overridden = renderSwitch({
      province: "ontario",
      provinceCode: "ON",
      grade: 3,
      view: "sequence",
      showSequenceToggle: true,
      jurisdictions: onlyOn,
    });
    expect(overridden.match(/<a /g)?.length).toBeGreaterThan(0);
    expect(overridden).toContain('aria-current="page"');
    expect((overridden.match(/Coming soon/g) ?? []).length).toBe(11);
    expect(overridden).not.toContain("Quebec");
    expect(overridden).not.toContain("tabindex");
    const bc = JURISDICTIONS.find((item) => item.code === "BC");
    expect(bc).toBeTruthy();
    expect(provinceHref(bc!, 3, "sequence")).toBe("/curriculum/british-columbia/grade-3");
    expect(loadGradePage("quebec", 3, null)).toBeNull();
    expect(staticCurriculumParams().some((item) => item.province === "quebec")).toBe(false);
    expect(generateStaticParams().some((item) => item.province === "ontario" && item.grade === "grade-3")).toBe(true);
    const alberta = JURISDICTIONS.find((item) => item.code === "AB");
    expect(provinceHref(alberta!, 7, null, "2027-09-01")).toBe("/curriculum/alberta/grade-1?from=7");
    expect(loadGradePage("alberta", 1, 7, "2027-09-01")?.gradeNote).toBe(
      "Grade 7 isn't available for Alberta yet. Showing Grade 1.",
    );
    expect(isGradePublished("AB", 7, "2027-08-31")).toBe(true);
    expect(isGradePublished("AB", 7, "2027-09-01")).toBe(false);
    expect(currentDocKey("AB", 7, "2027-08-31")).toBe("AB-MATH-K9-2016");
    expect(currentDocKey("AB", 7, "2027-09-01")).toBe("AB-MATH-7-9-NEW");
    const comingGrades = renderSwitch({
      province: "ontario",
      provinceCode: "ZZ",
      grade: 3,
      view: null,
      showSequenceToggle: false,
    });
    expect(comingGrades).toContain("Coming soon");
    expect(pillProvinces(false).every((item) => item.publishStatus === "published")).toBe(true);
  });

  it("axe scan of the pill bar has no violations", async () => {
    const markup = renderSwitch({
      province: "ontario",
      provinceCode: "ON",
      grade: 3,
      view: "sequence",
      showSequenceToggle: true,
    });
    const dom = new JSDOM(`<!doctype html><html><head><style>:root{--blue:#1f6f9a;--ink:#17344c;--muted:#4e6d84}</style></head><body><main>${markup}</main></body></html>`);
    const { window } = dom;
    globalThis.window = window as unknown as Window & typeof globalThis;
    globalThis.document = window.document;
    globalThis.Node = window.Node;
    globalThis.Element = window.Element;
    const results = await axe.run(window.document.querySelector("main") ?? window.document.body);
    expect(results.violations.map((violation) => `${violation.id}: ${violation.help}`)).toEqual([]);
  });
});

describe("section 5 british columbia and yukon", () => {
  it("publishes BC and Yukon and leaves the Northwest Territories unpublished", () => {
    const levels = catalog.standards.filter((standard) => standard.docKey === "BC-MATH-K9-2016");
    expect(levels.filter((standard) => standard.level === "content")).toHaveLength(120);
    expect(levels.filter((standard) => standard.level === "competency")).toHaveLength(134);
    expect(levels.filter((standard) => standard.level === "big_idea")).toHaveLength(40);
    const bc = page("british-columbia", 3);
    const ideas = bc.strands.find((strand) => strand.code === "big_idea");
    const content = bc.strands.find((strand) => strand.code === "content");
    const competencies = bc.strands.find((strand) => strand.code === "competency");
    expect(ideas?.items).toHaveLength(5);
    expect(content?.items).toHaveLength(14);
    expect(content?.items[0]?.title).toBe("number concepts to 1000");
    expect(content?.items[13]?.title).toBe(
      "financial literacy — fluency with coins and bills to 100 dollars, and earning and payment",
    );
    expect(competencies?.items.filter((item) => item.kind === "group").map((item) => item.title)).toEqual([
      "Reasoning and analyzing",
      "Understanding and solving",
      "Communicating and representing",
      "Connecting and reflecting",
    ]);
    expect(competencies?.items.filter((item) => item.kind !== "group")).toHaveLength(16);
    const yukon = page("yukon", 3);
    expect(yukon.follows).toBe("Yukon follows the British Columbia curriculum.");
    expect(yukon.strands.find((strand) => strand.code === "content")?.items.map((item) => item.title)).toEqual(
      content?.items.map((item) => item.title),
    );
    const html = visibleText(renderGrade(bc, "strands"));
    expect(html).not.toMatch(/BC-MA-/);
    expect(renderGrade(bc, "strands")).toContain('data-code-type="derived"');
    expect(html).toContain("Masterasium ref");
    expect(html).toContain("Content 1");
    expect(loadGradePage("northwest-territories", 5, null)).toBeNull();
    expect(JURISDICTIONS.find((item) => item.code === "NT")?.publishStatus).toBe("coming_soon");
    const csv = parseAlignmentCsv(readFileSync("data/curriculum/grade3-starter-alignments.csv", "utf8"));
    expect(csv.map((row) => `${row.skillSlug}|${row.jurisdiction}|${row.code}`)).toEqual(
      STARTER_ALIGNMENTS.map((row) => `${row.skillSlug}|${row.jurisdiction}|${row.code}`),
    );
    expect(catalog.alignments.some((alignment) => alignment.docKey === "ON-MATH-2020" && alignment.skillSlug === "g3-place-value-1000")).toBe(false);
    const bcCodes = csv.filter((row) => row.jurisdiction === "BC").map((row) => row.code);
    expect(bcCodes.every((code) => catalog.alignments.some((alignment) => alignment.docKey === "BC-MATH-K9-2016" && alignment.code === code))).toBe(true);
  });
});

describe("section 6 alberta", () => {
  it("loads K-6 outcomes and the legacy grade 7 banner", () => {
    const k6 = catalog.standards.filter((standard) => standard.docKey === "AB-MATH-K6-2022");
    expect(k6).toHaveLength(68);
    for (const [grade, count] of [[1, 8], [2, 8], [3, 11], [4, 13], [5, 13], [6, 15]] as const) {
      expect(k6.filter((standard) => standard.grade === grade)).toHaveLength(count);
    }
    const legacy = catalog.standards.filter((standard) => standard.docKey === "AB-MATH-K9-2016");
    expect(legacy.filter((standard) => standard.grade === 7)).toHaveLength(25);
    expect(legacy.filter((standard) => standard.grade === 8)).toHaveLength(17);
    const grade3 = page("alberta", 3);
    const outcomes = grade3.strands.flatMap((strand) => strand.items).filter((item) => item.kind !== "group" && item.kind !== "subhead");
    expect(outcomes).toHaveLength(11);
    expect(outcomes[0]?.title).toBe("Students interpret place value to 100 000.");
    expect(outcomes[0]?.chips[0]?.label).toBe("Number outcome 1");
    const grade7 = page("alberta", 7);
    expect(grade7.banner).toBe(
      "Alberta is replacing this Grade 7-8 math curriculum. This page follows the 2016 program, in force until August 2027.",
    );
    expect(grade7.strands.flatMap((strand) => strand.items).some((item) => item.chips.some((chip) => chip.label === "Number SO 1"))).toBe(true);
    const html = visibleText(`${renderGrade(grade3, "strands")} ${renderGrade(grade7, "strands")}`);
    expect(html).not.toMatch(/AB-G\d/);
    expect(html).toContain("Alberta revised parts of this curriculum; content checked 2026-10-17.");
    for (const standard of catalog.standards.filter((item) => item.sourceSystemId)) {
      expect(html.includes(standard.sourceSystemId!)).toBe(false);
    }
  });
});

describe("section 7 saskatchewan and manitoba", () => {
  it("shows official codes, the N3.3 note, and 2.PR.1", () => {
    expect(catalog.standards.filter((standard) => standard.docKey === "SK-MATH-1-8")).toHaveLength(125);
    expect(catalog.standards.filter((standard) => standard.docKey === "MB-MATH-K8-2013")).toHaveLength(186);
    const sk = page("saskatchewan", 3);
    const codes = sk.strands.flatMap((strand) => strand.items).flatMap((item) => item.chips.map((chip) => chip.code));
    expect(codes).toEqual(["N3.1", "N3.2", "N3.3", "N3.4", "P3.1", "P3.2", "SS3.1", "SS3.2", "SS3.3", "SS3.4", "SS3.5", "SP3.1"]);
    const html = visibleText(renderGrade(sk, "strands"));
    expect(html).toContain("It is not intended that students memorize the basic facts.");
    expect(html).toContain("C Communication");
    const mb = page("manitoba", 3);
    const number = mb.strands.find((strand) => strand.code === "N")?.items.map((item) => item.chips[0]?.code) ?? [];
    expect(number).toEqual(["3.N.1", "3.N.2", "3.N.3", "3.N.4", "3.N.5", "3.N.6", "3.N.7", "3.N.8", "3.N.9", "3.N.10", "3.N.11", "3.N.12", "3.N.13"]);
    const n10 = mb.strands.flatMap((strand) => strand.items).find((item) => item.chips.some((chip) => chip.code === "3.N.10"));
    expect(n10?.title).toBe("Apply mental math strategies to determine addition facts and related subtraction facts to 18 (9 + 9)");
    const grade2 = visibleText(renderGrade(page("manitoba", 2), "strands"));
    expect(grade2).toContain("2.PR.1");
    const grade2Codes = page("manitoba", 2).strands.flatMap((strand) => strand.items).flatMap((item) => item.chips.map((chip) => chip.label));
    expect(grade2Codes).toContain("2.PR.1");
    expect(grade2Codes).not.toContain("2.RR.1");
    expect(sk.strands.flatMap((strand) => strand.items).every((item) => item.chips.every((chip) => chip.codeType === "official"))).toBe(true);
  });
});

describe("section 8 nova scotia and pei", () => {
  it("publishes NS and PE and keeps NL, NB, and Nunavut coming soon", () => {
    expect(catalog.standards.filter((standard) => standard.docKey === "NS-MATH-2022")).toHaveLength(173);
    expect(catalog.standards.filter((standard) => standard.docKey === "PE-MATH-2024")).toHaveLength(145);
    const ns = page("nova-scotia", 3);
    expect(ns.strands.flatMap((strand) => strand.items).flatMap((item) => item.chips.map((chip) => chip.label))).toEqual([
      "N01", "N02", "N03", "N04", "N05", "N06", "N07", "N08", "N09", "N10", "N11", "N12", "N13",
      "PR01", "PR02", "PR03",
      "M01", "M02", "M03", "M04", "M05",
      "G01", "G02",
      "SP01", "SP02",
    ]);
    const flagged = catalog.standards.filter((standard) => standard.docKey === "PE-MATH-2024" && standard.needsReview);
    expect(flagged.map((standard) => standard.code).sort()).toEqual(["7.PR6", "7.SS1", "8.PR2"]);
    const pe8 = page("prince-edward-island", 8);
    const html = visibleText(renderGrade(pe8, "strands"));
    expect(html).toContain("Being checked");
    for (const standard of flagged) expect(html.includes(standard.text)).toBe(false);
    for (const code of ["NL", "NB", "NU"]) {
      expect(JURISDICTIONS.find((item) => item.code === code)?.publishStatus).toBe("coming_soon");
    }
    function Harness() {
      rememberSlug("nunavut");
      return createElement(CurriculumNotFound);
    }
    const notFound = visibleText(renderToStaticMarkup(createElement(Harness)));
    expect(notFound).toContain("Nunavut is coming soon. We publish a province only after checking its current official curriculum.");
    expect(notFound).toContain("Ontario");
    expect(notFound).not.toContain("Quebec");
  });
});
