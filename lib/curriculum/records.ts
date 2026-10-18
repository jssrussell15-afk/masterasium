export type CodeType = "official" | "derived";

export type StandardLevel = "overall" | "specific" | "outcome" | "content" | "competency" | "big_idea";

export type StrandRecord = {
  docKey: string;
  code: string;
  codeType: CodeType;
  name: string;
  displayOrder: number;
};

export type StandardRecord = {
  /** Stable natural key: docKey, grade, and code. */
  id: string;
  docKey: string;
  grade: number;
  code: string;
  codeType: CodeType;
  level: StandardLevel;
  parentCode: string | null;
  text: string;
  extra: Record<string, unknown>;
  sourceSystemId: string | null;
  sourceUrl: string;
  displayOrder: number;
  needsReview: boolean;
  lastVerified: string;
  strandCode: string;
};

export type SkillRecord = {
  slug: string;
  title: string;
  description: string | null;
  practiceId: string | null;
};

export type AlignmentRecord = {
  skillSlug: string;
  docKey: string;
  grade: number;
  code: string;
  strength: "primary" | "partial";
  note: string | null;
};

export type SequenceRecord = {
  jurisdiction: string;
  grade: number;
  docKey: string;
  label: string;
  basis: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isPublished: boolean;
};

export type SequenceItemRecord = {
  position: number;
  blockTitle: string;
  approxWeeks: number | null;
  standardId: string;
  skillSlug: string | null;
  isSpiral: boolean;
};

export function standardId(docKey: string, grade: number, code: string): string {
  return `${docKey}:${grade}:${code}`;
}
