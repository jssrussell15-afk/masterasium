import { standardId, type AlignmentRecord, type SkillRecord, type StandardRecord, type StrandRecord } from "@/lib/curriculum/records";

type Loose = Record<string, unknown>;

function text(row: Loose, key: string): string {
  const value = row[key];
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function num(row: Loose, key: string): number {
  return Number(row[key]);
}

export function importBc(rows: Loose[]): { strands: StrandRecord[]; standards: StandardRecord[] } {
  const docKey = "BC-MATH-K9-2016";
  const strands: StrandRecord[] = [
    { docKey, code: "big_idea", codeType: "derived", name: "Big Ideas", displayOrder: 1 },
    { docKey, code: "content", codeType: "derived", name: "Content", displayOrder: 2 },
    { docKey, code: "competency", codeType: "derived", name: "Curricular Competencies", displayOrder: 3 },
  ];
  const kindOrder = ["big_idea", "content", "competency"];
  const levelFor: Record<string, StandardRecord["level"]> = {
    content: "content",
    competency: "competency",
    big_idea: "big_idea",
  };
  const sorted = [...rows].sort((a, b) => num(a, "grade") - num(b, "grade") || kindOrder.indexOf(text(a, "kind")) - kindOrder.indexOf(text(b, "kind")) || num(a, "seq") - num(b, "seq"));
  const counters = new Map<string, number>();
  const standards = sorted.map((row) => {
    const grade = num(row, "grade");
    const key = String(grade);
    const order = (counters.get(key) ?? 0) + 1;
    counters.set(key, order);
    const kind = text(row, "kind");
    const elaboration = text(row, "elaboration");
    const ntFlag = text(row, "nt_flag");
    const extra: Record<string, unknown> = {};
    if (elaboration) extra.elaboration = elaboration;
    if (text(row, "group")) extra.group = text(row, "group");
    if (ntFlag) extra.nt_flag = ntFlag;
    extra.seq = num(row, "seq");
    return {
      id: standardId(docKey, grade, text(row, "code")),
      docKey,
      grade,
      code: text(row, "code"),
      codeType: "derived" as const,
      level: levelFor[kind] ?? "content",
      parentCode: null,
      text: text(row, "text"),
      extra,
      sourceSystemId: null,
      sourceUrl: text(row, "source_url"),
      displayOrder: order,
      needsReview: false,
      lastVerified: text(row, "last_verified"),
      strandCode: kind,
    };
  });
  return { strands, standards };
}

const AB_K6_CODE: Record<string, string> = {
  Number: "NUM",
  Algebra: "ALG",
  Geometry: "GEO",
  "Coordinate Geometry": "CG",
  Measurement: "MEA",
  Patterns: "PAT",
  Time: "TIM",
  Statistics: "STA",
};

const AB_LEGACY_CODE: Record<string, string> = {
  Number: "N",
  "Patterns and Relations": "PR",
  "Shape and Space": "SS",
  "Statistics and Probability": "SP",
};

export function importAlbertaK6(rows: Loose[]): { strands: StrandRecord[]; standards: StandardRecord[] } {
  return importNamedStrands("AB-MATH-K6-2022", rows, AB_K6_CODE, (row, order) => ({
    level: "outcome",
    codeType: "derived",
    sourceSystemId: text(row, "source_system_id") || null,
    extra: {
      organizing_idea: text(row, "organizing_idea"),
      guiding_question: text(row, "guiding_question"),
      knowledge: text(row, "knowledge"),
      understanding: text(row, "understanding"),
      skills_procedures: text(row, "skills_procedures"),
      source_last_modified: text(row, "source_last_modified"),
      source_data_url: text(row, "source_data_url"),
    },
    displayOrder: order,
  }));
}

export function importAlbertaLegacy(rows: Loose[]): { strands: StrandRecord[]; standards: StandardRecord[] } {
  return importNamedStrands("AB-MATH-K9-2016", rows, AB_LEGACY_CODE, (row, order) => ({
    level: "outcome",
    codeType: "derived",
    sourceSystemId: null,
    extra: {
      substrand: text(row, "substrand"),
      official_number: num(row, "official_number"),
      processes: text(row, "processes"),
      note: text(row, "note"),
    },
    displayOrder: order,
  }));
}

const SK_CODE: Record<string, string> = {
  Number: "N",
  "Patterns and Relations": "P",
  "Shape and Space": "SS",
  "Statistics and Probability": "SP",
};

const MB_CODE: Record<string, string> = {
  Number: "N",
  "Patterns and Relations": "PR",
  "Shape and Space": "SS",
  "Statistics and Probability": "SP",
};

const NS_CODE: Record<string, string> = {
  Number: "N",
  "Patterns and Relations": "PR",
  Measurement: "M",
  Geometry: "G",
  "Statistics and Probability": "SP",
};

const PE_CODE: Record<string, string> = {
  Number: "N",
  "Patterns and Relations": "PR",
  "Shape and Space": "SS",
  "Statistics and Probability": "SP",
};

export function importSaskatchewan(rows: Loose[]) {
  return importOfficial("SK-MATH-1-8", rows, SK_CODE, false);
}

export function importManitoba(rows: Loose[]) {
  const built = importOfficial("MB-MATH-K8-2013", rows, MB_CODE, false);
  const strandOrder = new Map(built.strands.map((strand) => [strand.code, strand.displayOrder]));
  const grouped = new Map<number, StandardRecord[]>();
  for (const standard of built.standards) {
    const list = grouped.get(standard.grade) ?? [];
    list.push(standard);
    grouped.set(standard.grade, list);
  }
  const standards: StandardRecord[] = [];
  for (const grade of [...grouped.keys()].sort((a, b) => a - b)) {
    const list = grouped.get(grade) ?? [];
    list.sort((a, b) => {
      const strand = (strandOrder.get(a.strandCode) ?? 0) - (strandOrder.get(b.strandCode) ?? 0);
      if (strand !== 0) return strand;
      return trailingNumber(a.code) - trailingNumber(b.code);
    });
    list.forEach((standard, index) => {
      standard.displayOrder = index + 1;
    });
    standards.push(...list);
  }
  return { strands: built.strands, standards };
}

export function importNovaScotia(rows: Loose[]) {
  return importOfficial("NS-MATH-2022", rows, NS_CODE, false, (row) => ({ display_code: text(row, "display_code") }));
}

export function importPei(rows: Loose[]) {
  return importOfficial("PE-MATH-2024", rows, PE_CODE, true);
}

function trailingNumber(code: string): number {
  const match = /(\d+)$/.exec(code);
  return match ? Number(match[1]) : 0;
}

function importOfficial(
  docKey: string,
  rows: Loose[],
  codes: Record<string, string>,
  reviewFlag: boolean,
  extraFor?: (row: Loose) => Record<string, unknown>,
) {
  return importNamedStrands(docKey, rows, codes, (row, order) => {
    const review = text(row, "needs_manual_review");
    const extra: Record<string, unknown> = { ...(extraFor ? extraFor(row) : {}) };
    if (text(row, "processes")) extra.processes = text(row, "processes");
    if (text(row, "note")) extra.note = text(row, "note");
    return {
      level: "outcome" as const,
      codeType: "official" as const,
      sourceSystemId: null,
      extra,
      displayOrder: order,
      needsReview: reviewFlag && review.toLowerCase().startsWith("yes"),
    };
  });
}

function importNamedStrands(
  docKey: string,
  rows: Loose[],
  codes: Record<string, string>,
  build: (
    row: Loose,
    order: number,
  ) => {
    level: StandardRecord["level"];
    codeType: StandardRecord["codeType"];
    sourceSystemId: string | null;
    extra: Record<string, unknown>;
    displayOrder: number;
    needsReview?: boolean;
  },
): { strands: StrandRecord[]; standards: StandardRecord[] } {
  const strandNames: string[] = [];
  for (const row of rows) {
    const name = text(row, "strand");
    if (name && !strandNames.includes(name)) strandNames.push(name);
  }
  const strands: StrandRecord[] = strandNames.map((name, index) => ({
    docKey,
    code: codes[name] ?? name,
    codeType: "derived",
    name,
    displayOrder: index + 1,
  }));
  const counters = new Map<number, number>();
  const standards: StandardRecord[] = rows.map((row) => {
    const grade = num(row, "grade");
    const order = (counters.get(grade) ?? 0) + 1;
    counters.set(grade, order);
    const built = build(row, order);
    const name = text(row, "strand");
    return {
      id: standardId(docKey, grade, text(row, "code")),
      docKey,
      grade,
      code: text(row, "code"),
      codeType: built.codeType,
      level: built.level,
      parentCode: null,
      text: text(row, "text"),
      extra: built.extra,
      sourceSystemId: built.sourceSystemId,
      sourceUrl: text(row, "source_url"),
      displayOrder: built.displayOrder,
      needsReview: built.needsReview ?? false,
      lastVerified: text(row, "last_verified"),
      strandCode: codes[name] ?? name,
    };
  });
  return { strands, standards };
}

export type CsvAlignment = {
  skillSlug: string;
  skillTitle: string;
  jurisdiction: string;
  grade: number;
  code: string;
  strength: "primary" | "partial";
  note: string | null;
};

export function parseAlignmentCsv(csv: string): CsvAlignment[] {
  const lines = csv.trim().split(/\r?\n/).slice(1);
  return lines.filter(Boolean).map((line) => {
    const [skillSlug, skillTitle, jurisdiction, grade, code, strength, ...rest] = line.split(",");
    const note = rest.join(",").trim();
    return {
      skillSlug,
      skillTitle,
      jurisdiction,
      grade: Number(grade),
      code,
      strength: strength === "partial" ? "partial" : "primary",
      note: note || null,
    };
  });
}

export function alignmentsFor(
  rows: CsvAlignment[],
  jurisdiction: string,
  docKey: string,
): { skills: SkillRecord[]; alignments: AlignmentRecord[] } {
  const skills: SkillRecord[] = [];
  const seen = new Set<string>();
  const alignments: AlignmentRecord[] = [];
  for (const row of rows) {
    if (row.jurisdiction !== jurisdiction) continue;
    if (!seen.has(row.skillSlug)) {
      skills.push({ slug: row.skillSlug, title: row.skillTitle, description: null, practiceId: null });
      seen.add(row.skillSlug);
    }
    alignments.push({
      skillSlug: row.skillSlug,
      docKey,
      grade: row.grade,
      code: row.code,
      strength: row.strength,
      note: row.note,
    });
  }
  return { skills, alignments };
}
