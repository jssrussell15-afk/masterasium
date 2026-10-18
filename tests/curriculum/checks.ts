import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CurriculumGrade } from "@/components/curriculum-grade";
import { CurriculumSwitch } from "@/components/curriculum-switch";
import { getCatalog, type Catalog } from "@/lib/curriculum/catalog";
import { currentDocKey, todayIso } from "@/lib/curriculum/documents";
import { JURISDICTIONS, type Jurisdiction } from "@/lib/curriculum/jurisdictions";
import type { StandardRecord } from "@/lib/curriculum/records";
import {
  isGradePublished,
  loadGradePage,
  publishedGrades,
  type GradePage,
} from "@/lib/curriculum/view";
import type { SupportedGrade } from "@/lib/grades";
import albertaK6 from "@/data/curriculum/alberta-k6-2022.json" with { type: "json" };
import albertaLegacy from "@/data/curriculum/alberta-7-8-legacy-2016.json" with { type: "json" };
import bcYukon from "@/data/curriculum/bc-yukon-2016.json" with { type: "json" };
import manitoba from "@/data/curriculum/manitoba.json" with { type: "json" };
import novaScotia from "@/data/curriculum/nova-scotia-2022.json" with { type: "json" };
import ontario from "@/data/curriculum/ontario-2020.json" with { type: "json" };
import pei from "@/data/curriculum/pei-2024.json" with { type: "json" };
import saskatchewan from "@/data/curriculum/saskatchewan.json" with { type: "json" };

const ALLOWED_HOSTS = new Set([
  "www.dcp.edu.gov.on.ca",
  "assets-us-01.kc-usercontent.com",
  "curriculum.gov.bc.ca",
  "curriculum.learnalberta.ca",
  "curriculum.gov.sk.ca",
  "www.edu.gov.mb.ca",
  "curriculum.novascotia.ca",
  "www.princeedwardisland.ca",
]);

const OFFICIAL_DOCS = new Set(["ON-MATH-2020", "SK-MATH-1-8", "MB-MATH-K8-2013", "NS-MATH-2022", "PE-MATH-2024"]);

const CODE_FORMAT: Record<string, RegExp> = {
  "ON-MATH-2020": /^[A-F][0-9](\.[0-9]{1,2})?$/,
  "SK-MATH-1-8": /^(N|P|SS|SP)[1-8]\.[0-9]{1,2}$/,
  "MB-MATH-K8-2013": /^[1-8]\.(N|PR|SS|SP)\.[0-9]{1,2}$/,
  "NS-MATH-2022": /^(N|PR|M|G|SP)[0-9]{2}$/,
  "PE-MATH-2024": /^[1-8]\.(N|PR|SS|SP)[0-9]{1,2}$/,
};

const C4_TEXT =
  "apply the process of mathematical modelling to represent, analyse, make predictions, and provide insight into real-life situations";

const ONTARIO_EXTRA_OVERALLS = new Set(["B1", "B2", "C1", "C2", "C3", "D1", "D2", "E1", "E2", "F1", "C4"]);

const PILL_CSS = `
:root { --blue: #1f6f9a; --ink: #17344c; --muted: #4e6d84; --line: #c5dfed; }
.pill-row a[aria-current="page"] {
  background: var(--blue);
  color: white;
  border-color: var(--blue);
  font-weight: 800;
}
.pill-row a[aria-current="page"]::before {
  content: "✓";
  margin-right: 0.28rem;
}
`;

export type CheckResult = {
  id: string;
  name: string;
  status: "pass" | "fail" | "skipped";
  failures: string[];
  note: string;
};

export type QaReport = {
  checks: CheckResult[];
  markdown: string;
};

type FileRow = { grade: number; code: string; text: string; codeType: string };

type Options = {
  includeHtml?: boolean;
  now?: string;
};

export function runCurriculumChecks(catalog: Catalog = getCatalog(), options: Options = {}): QaReport {
  const includeHtml = options.includeHtml !== false;
  const now = options.now ?? todayIso();
  const pages = includeHtml ? publishedPages(now) : [];
  const html = new Map(pages.map((entry) => [entry.id, renderGrade(entry.page, "strands")]));
  const checks = [
    checkAlignedSkills(catalog, pages),
    checkSources(catalog),
    checkDerivedNotOfficial(catalog, html, includeHtml),
    checkFilePlacements(catalog),
    checkOntarioRegressions(catalog, pages, includeHtml),
    checkSequences(catalog, pages, includeHtml),
    checkLastVerified(catalog, pages, html, includeHtml, now),
    checkEffectiveDates(catalog),
    checkReviewFlags(catalog, html, includeHtml),
    checkPills(includeHtml),
  ];
  return { checks, markdown: markdownReport(checks) };
}

export function renderGrade(page: GradePage, view: "strands" | "sequence"): string {
  return renderToStaticMarkup(createElement(CurriculumGrade, { page, view }));
}

export function renderSwitch(props: {
  province: string;
  provinceCode: string;
  grade: SupportedGrade;
  view: "strands" | "sequence" | null;
  showSequenceToggle: boolean;
  jurisdictions?: Jurisdiction[];
}): string {
  return renderToStaticMarkup(createElement(CurriculumSwitch, props));
}

function publishedPages(now: string): { id: string; slug: string; grade: SupportedGrade; page: GradePage }[] {
  const pages = [];
  for (const jurisdiction of JURISDICTIONS.filter((item) => item.publishStatus === "published")) {
    for (const grade of publishedGrades(jurisdiction.code, now)) {
      const page = loadGradePage(jurisdiction.slug, grade, null, now);
      if (!page) continue;
      pages.push({ id: `${jurisdiction.slug}/grade-${grade}`, slug: jurisdiction.slug, grade, page });
    }
  }
  return pages;
}

function finish(id: string, name: string, failures: string[], note = ""): CheckResult {
  const unique = [...new Set(failures)];
  return { id, name, status: unique.length === 0 ? "pass" : "fail", failures: unique, note };
}

function skip(id: string, name: string, note: string): CheckResult {
  return { id, name, status: "skipped", failures: [], note };
}

function checkAlignedSkills(catalog: Catalog, pages: { page: GradePage }[]): CheckResult {
  const skillSlugs = new Set(catalog.skills.map((skill) => skill.slug));
  const shown = new Set<string>();
  for (const { page } of pages) {
    for (const strand of page.strands) {
      for (const item of strand.items) {
        if (skillSlugs.has(item.key)) shown.add(item.key);
      }
    }
    for (const block of page.sequence?.blocks ?? []) {
      for (const item of [...block.main, ...block.review]) {
        if (skillSlugs.has(item.key)) shown.add(item.key);
      }
    }
  }
  const aligned = new Set(catalog.alignments.map((alignment) => alignment.skillSlug));
  const failures = [...shown].filter((slug) => !aligned.has(slug));
  const orphans = catalog.skills.filter((skill) => !aligned.has(skill.slug)).map((skill) => skill.slug);
  return finish("1", "Every published skill links to a standard", [...failures, ...orphans]);
}

function checkSources(catalog: Catalog): CheckResult {
  const failures: string[] = [];
  for (const standard of catalog.standards) {
    let host = "";
    try {
      host = new URL(standard.sourceUrl).host;
    } catch {
      host = "";
    }
    if (!standard.sourceUrl?.startsWith("https://") || !ALLOWED_HOSTS.has(host)) failures.push(standard.id);
  }
  return finish("2", "Every standard source is an allowed https host", failures);
}

function checkDerivedNotOfficial(catalog: Catalog, html: Map<string, string>, includeHtml: boolean): CheckResult {
  const failures: string[] = [];
  for (const standard of catalog.standards) {
    if (standard.codeType === "official" && !OFFICIAL_DOCS.has(standard.docKey)) failures.push(standard.id);
    if (standard.codeType !== "official") continue;
    const pattern = CODE_FORMAT[standard.docKey];
    if (pattern && !pattern.test(standard.code)) failures.push(standard.id);
  }
  if (!includeHtml) return finish("3", "Derived codes are not shown as official", failures, "HTML half skipped");
  const systemIds = catalog.standards.map((standard) => standard.sourceSystemId).filter((id): id is string => Boolean(id));
  for (const [pageId, markup] of html) {
    const text = visibleText(markup);
    if (/(^|\s)BC-MA-/.test(text) || /(^|\s)AB-G\d/.test(text)) failures.push(pageId);
    for (const systemId of systemIds) {
      if (systemId.length >= 8 && text.includes(systemId)) failures.push(`${pageId}:${systemId}`);
    }
    for (const chip of chipsIn(markup)) {
      if (chip.codeType === "derived" && !chip.html.includes("Masterasium ref")) failures.push(`${pageId}:missing-ref`);
      if (chip.codeType !== "derived" && chip.codeType !== "official") failures.push(`${pageId}:bad-code-type`);
    }
  }
  return finish("3", "Derived codes are not shown as official", failures);
}

function checkFilePlacements(catalog: Catalog): CheckResult {
  const failures: string[] = [];
  const files: { docKey: string; rows: FileRow[] }[] = [
    { docKey: "ON-MATH-2020", rows: rowsOf(ontario) },
    { docKey: "BC-MATH-K9-2016", rows: rowsOf(bcYukon) },
    { docKey: "AB-MATH-K6-2022", rows: rowsOf(albertaK6) },
    { docKey: "AB-MATH-K9-2016", rows: rowsOf(albertaLegacy) },
    { docKey: "SK-MATH-1-8", rows: rowsOf(saskatchewan) },
    { docKey: "MB-MATH-K8-2013", rows: rowsOf(manitoba) },
    { docKey: "NS-MATH-2022", rows: rowsOf(novaScotia) },
    { docKey: "PE-MATH-2024", rows: rowsOf(pei) },
  ];
  for (const file of files) {
    const standards = catalog.standards.filter((standard) => standard.docKey === file.docKey);
    const byKey = new Map(standards.map((standard) => [`${standard.grade}:${standard.code}`, standard]));
    const fileKeys = new Set<string>();
    for (const row of file.rows) {
      const key = `${row.grade}:${row.code}`;
      fileKeys.add(key);
      const standard = byKey.get(key);
      if (!standard) {
        failures.push(`${file.docKey}:${key}`);
        continue;
      }
      if (standard.codeType !== row.codeType) failures.push(standard.id);
      const cleared = standard.docKey === "PE-MATH-2024" && !standard.needsReview && Boolean(standard.extra.manual_text_source);
      if (!cleared && standard.text !== row.text) failures.push(standard.id);
    }
    for (const standard of standards) {
      if (fileKeys.has(`${standard.grade}:${standard.code}`)) continue;
      if (standard.docKey === "ON-MATH-2020" && standard.level === "overall" && ONTARIO_EXTRA_OVERALLS.has(standard.code)) {
        if (standard.code === "C4" && standard.text !== C4_TEXT) failures.push(standard.id);
        continue;
      }
      failures.push(standard.id);
    }
  }
  failures.push(...countFailures(catalog));
  return finish("4", "Grade placements match the source files", failures);
}

function countFailures(catalog: Catalog): string[] {
  const failures: string[] = [];
  const expect = (docKey: string, predicate: (standard: StandardRecord) => boolean, count: number, label: string) => {
    const actual = catalog.standards.filter((standard) => standard.docKey === docKey && predicate(standard)).length;
    if (actual !== count) failures.push(`count:${label}:${actual}`);
  };
  expect("ON-MATH-2020", (standard) => standard.level === "specific", 369, "ON-specific");
  expect("ON-MATH-2020", (standard) => standard.code === "A1", 8, "ON-A1");
  expect("BC-MATH-K9-2016", () => true, 294, "BC");
  expect("BC-MATH-K9-2016", (standard) => standard.level === "content", 120, "BC-content");
  expect("BC-MATH-K9-2016", (standard) => standard.level === "competency", 134, "BC-competency");
  expect("BC-MATH-K9-2016", (standard) => standard.level === "big_idea", 40, "BC-big-idea");
  expect("AB-MATH-K6-2022", () => true, 68, "AB-K6");
  expect("AB-MATH-K9-2016", () => true, 42, "AB-legacy");
  expect("SK-MATH-1-8", () => true, 125, "SK");
  expect("MB-MATH-K8-2013", () => true, 186, "MB");
  expect("NS-MATH-2022", () => true, 173, "NS");
  expect("PE-MATH-2024", () => true, 145, "PE");
  return failures;
}

function checkOntarioRegressions(catalog: Catalog, pages: { page: GradePage }[], includeHtml: boolean): CheckResult {
  const failures: string[] = [];
  const onPages = new Map(pages.filter((entry) => entry.page.jurisdiction.code === "ON").map((entry) => [entry.page.grade, entry.page]));
  const skillsFor = (grade: number) => {
    const slugs = new Set(
      catalog.alignments.filter((alignment) => alignment.docKey === "ON-MATH-2020" && alignment.grade === grade).map((alignment) => alignment.skillSlug),
    );
    return catalog.skills.filter((skill) => slugs.has(skill.slug));
  };
  for (const skill of skillsFor(3)) {
    if (skill.title.includes("10×10") || /remainder/i.test(skill.title)) failures.push(skill.slug);
  }
  const grade4OnB22 = catalog.alignments.some(
    (alignment) => alignment.docKey === "ON-MATH-2020" && alignment.grade === 4 && alignment.code === "B2.2",
  );
  if (!grade4OnB22) failures.push("missing:ON:4:B2.2");
  const grade4OnGrade5Fractions = catalog.alignments.filter((alignment) => alignment.docKey === "ON-MATH-2020" && alignment.grade === 4);
  for (const alignment of grade4OnGrade5Fractions) {
    const also = catalog.alignments.some(
      (item) => item.skillSlug === alignment.skillSlug && item.docKey === "ON-MATH-2020" && item.grade === 5 && item.code === "B2.5",
    );
    if (also) failures.push(alignment.skillSlug);
  }
  for (const skill of skillsFor(5)) {
    if (skill.title.includes("Volume")) failures.push(skill.slug);
  }
  if (!includeHtml) return finish("5", "Ontario placement regressions", failures, "Heading half skipped");
  for (let grade = 1; grade <= 8; grade += 1) {
    const page = onPages.get(grade as SupportedGrade);
    if (!page) {
      failures.push(`missing-page:${grade}`);
      continue;
    }
    const headings = page.strands.map((strand) => strand.heading);
    const expected = ["A. ", "B. ", "C. ", "D. ", "E. ", "F. "];
    if (headings.length !== 6 || expected.some((prefix, index) => !headings[index]?.startsWith(prefix))) failures.push(`headings:${grade}`);
    const algebra = page.strands.find((strand) => strand.code === "C");
    const hasC3 = algebra?.items.some((item) => item.chips.some((chip) => chip.code.startsWith("C3")) || item.title.includes("C3"));
    if (!hasC3) failures.push(`missing-C3:${grade}`);
    for (const item of page.strands.flatMap((strand) => strand.items)) {
      if (item.kind === "skill" && item.chips.length === 0) failures.push(item.key);
    }
  }
  return finish("5", "Ontario placement regressions", failures);
}

function checkSequences(catalog: Catalog, pages: { page: GradePage }[], includeHtml: boolean): CheckResult {
  const failures: string[] = [];
  for (const sequence of catalog.sequences.filter((item) => item.isPublished)) {
    const specifics = catalog.standards.filter(
      (standard) => standard.docKey === sequence.docKey && standard.grade === sequence.grade && standard.level === "specific",
    );
    const covered = new Set(
      catalog.sequenceItems
        .map((item) => item.standardId)
        .filter((id) => id.startsWith(`${sequence.docKey}:${sequence.grade}:`)),
    );
    for (const standard of specifics) {
      if (!covered.has(standard.id)) failures.push(standard.id);
    }
    const positions = [...new Set(catalog.sequenceItems.map((item) => item.position))].sort((a, b) => a - b);
    const expected = positions.map((_, index) => index + 1);
    if (positions.join(",") !== expected.join(",")) failures.push(`positions:${sequence.jurisdiction}:${sequence.grade}`);
    if (sequence.label !== "Suggested by Masterasium") failures.push(`label:${sequence.jurisdiction}:${sequence.grade}`);
  }
  if (!includeHtml) return finish("6", "Sequence integrity", failures, "Visible label skipped");
  const grade3 = pages.find((entry) => entry.page.jurisdiction.code === "ON" && entry.page.grade === 3)?.page;
  if (!grade3?.sequence) failures.push("missing:ON:3:sequence");
  else if (!renderGrade(grade3, "sequence").includes("Suggested by Masterasium")) failures.push("missing-visible-label");
  return finish("6", "Sequence integrity", failures);
}

function checkLastVerified(
  catalog: Catalog,
  pages: { id: string; page: GradePage }[],
  html: Map<string, string>,
  includeHtml: boolean,
  now: string,
): CheckResult {
  if (!includeHtml) return skip("7", "Last verified footer", "HTML skipped");
  const failures: string[] = [];
  const warnings: string[] = [];
  const today = Date.parse(`${now}T00:00:00Z`);
  for (const entry of pages) {
    const markup = html.get(entry.id) ?? "";
    const match = /data-testid="last-verified"[\s\S]*?Last verified (\d{4}-\d{2}-\d{2})/.exec(markup);
    const doc = catalog.docs.find((item) => item.docKey === entry.page.docKey);
    if (!match || !doc || match[1] !== doc.lastVerified) failures.push(entry.id);
    if (match && today - Date.parse(`${match[1]}T00:00:00Z`) > 365 * 86400000) warnings.push(entry.id);
  }
  return finish("7", "Last verified footer", failures, warnings.length ? `warning older than 365 days: ${warnings.slice(0, 5).join(", ")}` : "");
}

function checkEffectiveDates(catalog: Catalog): CheckResult {
  const failures: string[] = [];
  if (currentDocKey("AB", 7, "2027-08-31") !== "AB-MATH-K9-2016") failures.push("AB:7:2027-08-31");
  if (currentDocKey("AB", 7, "2027-09-01") !== "AB-MATH-7-9-NEW") failures.push("AB:7:2027-09-01");
  if (currentDocKey("YT", 5, todayIso()) !== "BC-MATH-K9-2016") failures.push("YT:5:today");
  if (!isGradePublished("AB", 7, "2027-08-31") || isGradePublished("AB", 7, "2027-09-01")) failures.push("AB:7:published-window");
  const groups = new Map<string, typeof catalog.applicability>();
  for (const row of catalog.applicability) {
    const key = `${row.jurisdiction}:${row.grade}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }
  for (const [key, rows] of groups) {
    for (let i = 0; i < rows.length; i += 1) {
      for (let j = i + 1; j < rows.length; j += 1) {
        if (rangesOverlap(rows[i].effectiveFrom, rows[i].effectiveTo, rows[j].effectiveFrom, rows[j].effectiveTo)) {
          failures.push(key);
        }
      }
    }
  }
  return finish("8", "Effective dates do not overlap", failures);
}

function checkReviewFlags(catalog: Catalog, html: Map<string, string>, includeHtml: boolean): CheckResult {
  const hidden = catalog.standards.filter((standard) => standard.needsReview);
  if (!includeHtml) return skip("9", "Review flags hide official text", "HTML skipped");
  const failures: string[] = [];
  const all = [...html.values()].map(visibleText).join("\n");
  for (const standard of hidden) {
    if (standard.text && all.includes(standard.text)) failures.push(standard.id);
  }
  const pe8 = [...html.values()].find((markup) => markup.includes("Grade 8 math in Prince Edward Island"));
  if (pe8 && !visibleText(pe8).includes("Being checked")) failures.push("PE:8:missing-being-checked");
  return finish("9", "Review flags hide official text", failures);
}

function checkPills(includeHtml: boolean): CheckResult {
  if (!includeHtml) return skip("10", "Province pills", "HTML skipped");
  const markup = renderSwitch({
    province: "ontario",
    provinceCode: "ON",
    grade: 3,
    view: "sequence",
    showSequenceToggle: true,
  });
  const failures: string[] = [];
  if (markup.includes("Quebec")) failures.push("quebec-pill");
  const selected = /<a[^>]*aria-current="page"[^>]*>Ontario<\/a>/.exec(markup)?.[0] ?? "";
  if (!selected) failures.push("selected-current");
  const disabled = markup.match(/<span aria-disabled="true">[\s\S]*?<\/span><\/span>/g) ?? [];
  if (disabled.length === 0 || disabled.some((pill) => !pill.includes("Coming soon"))) failures.push("coming-soon-text");
  const dom = pillDom(markup);
  const current = [...dom.window.document.querySelectorAll('a[aria-current="page"]')];
  const province = current.find((node) => node.textContent?.includes("Ontario"));
  const style = province ? dom.window.getComputedStyle(province) : null;
  if (!style || style.color !== "rgb(255, 255, 255)" || style.fontWeight !== "800") failures.push("computed-ink");
  const declared = declaredSelectedPill();
  const resolvedFill = style?.backgroundColor ?? "";
  const tokens = readFileSync(new URL("../../app/tokens.css", import.meta.url), "utf8");
  const fillIsToken =
    declared.background === "var(--blue)" &&
    declared.color === "white" &&
    /--blue:\s*var\(--color-blue\)/.test(tokens) &&
    /--color-blue:\s*#1f6f9a/i.test(tokens);
  const fillComputed =
    resolvedFill === "rgb(31, 111, 154)" || resolvedFill === "rgba(0, 0, 0, 0)" || resolvedFill.startsWith("var(");
  if (!fillIsToken || !fillComputed) failures.push("computed-fill");
  if (!declared.check.includes("✓")) failures.push("computed-check");
  return finish("10", "Province pills", failures);
}

function rowsOf(value: unknown): FileRow[] {
  return (value as Record<string, unknown>[]).map((row) => ({
    grade: Number(row.grade),
    code: String(row.code),
    text: String(row.text),
    codeType: String(row.code_type),
  }));
}

function rangesOverlap(aFrom: string | null, aTo: string | null, bFrom: string | null, bTo: string | null): boolean {
  const startA = aFrom ?? "0001-01-01";
  const endA = aTo ?? "9999-12-31";
  const startB = bFrom ?? "0001-01-01";
  const endB = bTo ?? "9999-12-31";
  return startA <= endB && startB <= endA;
}

export function visibleText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function chipsIn(html: string): { codeType: string; html: string }[] {
  const chips: { codeType: string; html: string }[] = [];
  const pattern = /<details\b([^>]*)>([\s\S]*?)<\/details>/g;
  for (const match of html.matchAll(pattern)) {
    const codeType = /data-code-type="([^"]*)"/.exec(match[1])?.[1] ?? "";
    chips.push({ codeType, html: match[2] });
  }
  return chips;
}

function pillDom(html: string) {
  return new JSDOM(`<!doctype html><html><head><style>${PILL_CSS}</style></head><body><main>${html}</main></body></html>`, {
    pretendToBeVisual: true,
  });
}

/** Last matching rule in app/globals.css. jsdom does not resolve background: var() or ::before. */
function declaredSelectedPill(): { background: string; color: string; check: string } {
  const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (selector: string) => {
    const bodies: string[] = [];
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const selectors = match[1].split(",").map((item) => item.trim().replace(/\s+/g, " "));
      if (selectors.includes(selector)) bodies.push(match[2]);
    }
    return bodies.at(-1) ?? "";
  };
  const selected = rule('.pill-row a[aria-current="page"]');
  const before = rule('.pill-row a[aria-current="page"]::before');
  return {
    background: /background:\s*([^;]+)/.exec(selected)?.[1]?.trim() ?? "",
    color: /(?:^|\s|;)color:\s*([^;]+)/.exec(selected)?.[1]?.trim() ?? "",
    check: /content:\s*([^;]+)/.exec(before)?.[1] ?? "",
  };
}

export function markdownReport(checks: CheckResult[]): string {
  const lines = [
    "# Curriculum QA",
    "",
    "| Check | Name | Status | Failures | First ids | Note |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const check of checks) {
    lines.push(
      `| ${check.id} | ${check.name} | ${check.status} | ${check.failures.length} | ${check.failures.slice(0, 5).join(", ")} | ${check.note} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function readGlobalsCss(): string {
  return readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
}

export function elementTree(node: ReactElement): string {
  return renderToStaticMarkup(node);
}
