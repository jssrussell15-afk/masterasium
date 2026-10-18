import type { Jurisdiction } from "@/lib/curriculum/jurisdictions";

export type CurriculumDoc = {
  docKey: string;
  owner: string;
  title: string;
  publisher: string;
  publishedYear: number | null;
  sourceUrl: string;
  status: "current" | "being_replaced" | "legacy" | "draft" | "unverified";
  lastVerified: string;
  notes: string | null;
};

export type Applicability = {
  docKey: string;
  jurisdiction: string;
  grade: number;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  note: string | null;
};

export const DOCS: CurriculumDoc[] = [
  {
    docKey: "ON-MATH-2020",
    owner: "ON",
    title: "The Ontario Curriculum, Grades 1-8: Mathematics (2020)",
    publisher: "Ontario Ministry of Education",
    publishedYear: 2020,
    sourceUrl: "https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics",
    status: "current",
    lastVerified: "2026-10-17",
    notes: null,
  },
  {
    docKey: "BC-MATH-K9-2016",
    owner: "BC",
    title: "BC Mathematics K-9 (redesigned curriculum)",
    publisher: "BC Ministry of Education and Child Care",
    publishedYear: 2016,
    sourceUrl: "https://curriculum.gov.bc.ca/curriculum/mathematics",
    status: "current",
    lastVerified: "2026-10-17",
    notes: null,
  },
  {
    docKey: "AB-MATH-K6-2022",
    owner: "AB",
    title: "Alberta Mathematics Kindergarten to Grade 6",
    publisher: "Alberta Education",
    publishedYear: 2022,
    sourceUrl: "https://curriculum.learnalberta.ca/cdn/curriculum/gfc-mat.json",
    status: "current",
    lastVerified: "2026-10-17",
    notes: "Rendered at https://curriculum.learnalberta.ca/curriculum/en/c/mat3 and the other grade pages.",
  },
  {
    docKey: "AB-MATH-K9-2016",
    owner: "AB",
    title: "Alberta Mathematics Kindergarten to Grade 9 Program of Studies (2007, updated 2016)",
    publisher: "Alberta Education",
    publishedYear: 2016,
    sourceUrl: "https://curriculum.learnalberta.ca/cdn/assets/public/ef066215-6eae-5350-8ba0-f9fe82004ee8/mathematics-7-to-9.pdf",
    status: "being_replaced",
    lastVerified: "2026-10-17",
    notes: null,
  },
  {
    docKey: "AB-MATH-7-9-NEW",
    owner: "AB",
    title: "Alberta Mathematics 7-9 (new; draft on LearnAlberta)",
    publisher: "Alberta Education",
    publishedYear: null,
    sourceUrl: "https://curriculum.learnalberta.ca/cdn/cia/curriculum-definition/definitions.json",
    status: "draft",
    lastVerified: "2026-10-17",
    notes: "LearnAlberta entry MAT_7-9, status DRAFT. No standards in this seed.",
  },
  {
    docKey: "SK-MATH-1-8",
    owner: "SK",
    title: "Saskatchewan Mathematics 1-8",
    publisher: "Saskatchewan Ministry of Education",
    publishedYear: null,
    sourceUrl: "https://curriculum.gov.sk.ca/",
    status: "current",
    lastVerified: "2026-10-17",
    notes: null,
  },
  {
    docKey: "MB-MATH-K8-2013",
    owner: "MB",
    title: "Kindergarten to Grade 8 Mathematics: Manitoba Curriculum Framework of Outcomes (2013)",
    publisher: "Manitoba Education",
    publishedYear: 2013,
    sourceUrl: "https://www.edu.gov.mb.ca/k12/cur/math/framework_k-8/index.html",
    status: "current",
    lastVerified: "2026-10-17",
    notes: null,
  },
  {
    docKey: "NS-MATH-2022",
    owner: "NS",
    title: "Nova Scotia Mathematics 1-8 Outcomes (2022)",
    publisher: "NS Department of Education and Early Childhood Development",
    publishedYear: 2022,
    sourceUrl: "https://curriculum.novascotia.ca/",
    status: "current",
    lastVerified: "2026-10-17",
    notes: null,
  },
  {
    docKey: "PE-MATH-2024",
    owner: "PE",
    title: "PEI Mathematics Curriculum Grades 1-8",
    publisher: "PEI Department of Education and Early Years",
    publishedYear: 2024,
    sourceUrl: "https://www.princeedwardisland.ca/sites/default/files/publications/eelc_math_1.pdf",
    status: "current",
    lastVerified: "2026-10-17",
    notes: "One PDF per grade: eelc_math_<grade>.pdf. source_url points at the Grade 1 PDF.",
  },
  {
    docKey: "NU-MATH-K3",
    owner: "NU",
    title: "Nunavut K-3 mathematics (own curriculum)",
    publisher: "Nunavut Department of Education",
    publishedYear: null,
    sourceUrl: "https://www.gov.nu.ca/sites/default/files/documents/2024-10/Nunavut_Approved_Curriculum_and_Teaching_Resources__2024-2025_v2.pdf",
    status: "unverified",
    lastVerified: "2026-10-17",
    notes: "Unverified. Grades 1-3 use this document. Grades 4-8 point at AB-MATH-K9-2016.",
  },
];

const TRACKING = "2024-09-01 is when Masterasium starts tracking, not the official implementation date.";
const NU_NOTE =
  "Official in-force dates are not recorded. effective_from is unbounded so this seed does not invent a Nunavut start date. effective_to is open-ended.";

function grades(docKey: string, jurisdiction: string, from: number, to: number, effectiveFrom: string | null, effectiveTo: string | null, note: string | null): Applicability[] {
  const rows: Applicability[] = [];
  for (let grade = from; grade <= to; grade += 1) {
    rows.push({ docKey, jurisdiction, grade, effectiveFrom, effectiveTo, note });
  }
  return rows;
}

export const APPLICABILITY: Applicability[] = [
  ...grades("ON-MATH-2020", "ON", 1, 8, "2020-09-01", null, null),
  ...grades("BC-MATH-K9-2016", "BC", 1, 8, "2016-09-01", null, null),
  ...grades("BC-MATH-K9-2016", "YT", 1, 8, "2016-09-01", null, null),
  ...grades("BC-MATH-K9-2016", "NT", 4, 8, "2016-09-01", null, "NWT uses BC curriculum for grades 4-9; confirm the start year before publishing NT"),
  ...grades("AB-MATH-K6-2022", "AB", 1, 3, "2022-09-01", null, null),
  ...grades("AB-MATH-K6-2022", "AB", 4, 6, "2023-09-01", null, null),
  ...grades("AB-MATH-K9-2016", "AB", 7, 8, "2024-09-01", "2027-08-31", TRACKING),
  ...grades("AB-MATH-7-9-NEW", "AB", 7, 8, "2027-09-01", null, "No standards yet. The page shows Coming soon for these grades from this date until the new data is loaded."),
  ...grades("SK-MATH-1-8", "SK", 1, 8, "2024-09-01", null, TRACKING),
  ...grades("MB-MATH-K8-2013", "MB", 1, 8, "2024-09-01", null, TRACKING),
  ...grades("NS-MATH-2022", "NS", 1, 8, "2024-09-01", null, TRACKING),
  ...grades("PE-MATH-2024", "PE", 1, 8, "2024-09-01", null, TRACKING),
  ...grades("NU-MATH-K3", "NU", 1, 3, null, null, NU_NOTE),
  ...grades("AB-MATH-K9-2016", "NU", 4, 8, null, null, `${NU_NOTE} Grades 4-8 follow AB-MATH-K9-2016 until Nunavut announces its own curriculum.`),
];

export function docByKey(docKey: string): CurriculumDoc | undefined {
  return DOCS.find((doc) => doc.docKey === docKey);
}

export function currentDocKey(jurisdiction: string, grade: number, on: string): string | null {
  const matches = APPLICABILITY.filter((row) => {
    if (row.jurisdiction !== jurisdiction || row.grade !== grade) return false;
    if (row.effectiveFrom && row.effectiveFrom > on) return false;
    if (row.effectiveTo && row.effectiveTo < on) return false;
    return true;
  });
  if (matches.length > 1) {
    throw new Error(`Overlapping documents for ${jurisdiction} grade ${grade} on ${on}`);
  }
  return matches[0]?.docKey ?? null;
}

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type { Jurisdiction };
