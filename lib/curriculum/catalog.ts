import albertaK6 from "@/data/curriculum/alberta-k6-2022.json" with { type: "json" };
import albertaLegacy from "@/data/curriculum/alberta-7-8-legacy-2016.json" with { type: "json" };
import bcYukon from "@/data/curriculum/bc-yukon-2016.json" with { type: "json" };
import manitoba from "@/data/curriculum/manitoba.json" with { type: "json" };
import novaScotia from "@/data/curriculum/nova-scotia-2022.json" with { type: "json" };
import ontario from "@/data/curriculum/ontario-2020.json" with { type: "json" };
import corrections from "@/data/curriculum/ontario-skill-corrections.json" with { type: "json" };
import sequenceFile from "@/data/curriculum/ontario-g3-sequence.json" with { type: "json" };
import pei from "@/data/curriculum/pei-2024.json" with { type: "json" };
import saskatchewan from "@/data/curriculum/saskatchewan.json" with { type: "json" };
import { APPLICABILITY, DOCS, type Applicability, type CurriculumDoc } from "@/lib/curriculum/documents";
import { JURISDICTIONS, type Jurisdiction } from "@/lib/curriculum/jurisdictions";
import { importOntarioSkills, importOntarioStandards, ONTARIO_STRANDS } from "@/lib/curriculum/ontario-import";
import {
  alignmentsFor,
  importAlbertaK6,
  importAlbertaLegacy,
  importBc,
  importManitoba,
  importNovaScotia,
  importPei,
  importSaskatchewan,
} from "@/lib/curriculum/province-import";
import type { AlignmentRecord, SequenceItemRecord, SequenceRecord, SkillRecord, StandardRecord, StrandRecord } from "@/lib/curriculum/records";
import { importOntarioSequence, type SequenceFile } from "@/lib/curriculum/sequence-import";
import { STARTER_ALIGNMENTS } from "@/lib/curriculum/starter-alignments";

export type Catalog = {
  jurisdictions: Jurisdiction[];
  docs: CurriculumDoc[];
  applicability: Applicability[];
  strands: StrandRecord[];
  standards: StandardRecord[];
  skills: SkillRecord[];
  alignments: AlignmentRecord[];
  sequences: SequenceRecord[];
  sequenceItems: SequenceItemRecord[];
};

function loose(value: unknown): Record<string, unknown>[] {
  return value as Record<string, unknown>[];
}

function buildCatalog(): Catalog {
  const ontarioStandards = importOntarioStandards(ontario as never);
  const ontarioSkills = importOntarioSkills(corrections as never);
  const bc = importBc(loose(bcYukon));
  const abK6 = importAlbertaK6(loose(albertaK6));
  const abLegacy = importAlbertaLegacy(loose(albertaLegacy));
  const sk = importSaskatchewan(loose(saskatchewan));
  const mb = importManitoba(loose(manitoba));
  const ns = importNovaScotia(loose(novaScotia));
  const pe = importPei(loose(pei));
  const csv = STARTER_ALIGNMENTS.map((row) => ({
    ...row,
    strength: row.strength === "partial" ? ("partial" as const) : ("primary" as const),
    note: row.note || null,
  }));
  const packs = [
    alignmentsFor(csv, "BC", "BC-MATH-K9-2016"),
    alignmentsFor(csv, "AB", "AB-MATH-K6-2022"),
    alignmentsFor(csv, "SK", "SK-MATH-1-8"),
    alignmentsFor(csv, "MB", "MB-MATH-K8-2013"),
    alignmentsFor(csv, "NS", "NS-MATH-2022"),
    alignmentsFor(csv, "PE", "PE-MATH-2024"),
  ];
  const skills = [...ontarioSkills.skills];
  const alignments = [...ontarioSkills.alignments];
  for (const pack of packs) {
    for (const skill of pack.skills) {
      if (!skills.some((item) => item.slug === skill.slug)) skills.push(skill);
    }
    alignments.push(...pack.alignments);
  }
  const standards = [
    ...ontarioStandards,
    ...bc.standards,
    ...abK6.standards,
    ...abLegacy.standards,
    ...sk.standards,
    ...mb.standards,
    ...ns.standards,
    ...pe.standards,
  ];
  const sequence = importOntarioSequence(sequenceFile as SequenceFile, standards, alignments);
  return {
    jurisdictions: JURISDICTIONS,
    docs: DOCS,
    applicability: APPLICABILITY,
    strands: [...ONTARIO_STRANDS, ...bc.strands, ...abK6.strands, ...abLegacy.strands, ...sk.strands, ...mb.strands, ...ns.strands, ...pe.strands],
    standards,
    skills,
    alignments,
    sequences: [sequence.sequence],
    sequenceItems: sequence.items,
  };
}

let cached: Catalog | null = null;

export function getCatalog(): Catalog {
  if (!cached) cached = buildCatalog();
  return cached;
}
