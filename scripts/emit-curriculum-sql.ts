import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getCatalog } from "../lib/curriculum/catalog";
import type { AlignmentRecord, SequenceItemRecord, SequenceRecord, SkillRecord, StandardRecord, StrandRecord } from "../lib/curriculum/records";

const catalog = getCatalog();
const root = join(import.meta.dirname, "..", "supabase", "migrations");

function quote(value: string): string {
  let tag = "txt";
  while (value.includes(`$${tag}$`)) tag += "x";
  return `$${tag}$${value}$${tag}$`;
}

function sqlValue(value: string | number | boolean | null): string {
  if (value == null) return "null";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return quote(value);
}

function chunk<T>(rows: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < rows.length; index += size) groups.push(rows.slice(index, index + size));
  return groups;
}

function insertStrands(strands: StrandRecord[]): string {
  if (strands.length === 0) return "";
  const values = strands
    .map(
      (strand) =>
        `  ((select id from public.curriculum_doc where doc_key = ${quote(strand.docKey)}), ${quote(strand.code)}, ${quote(strand.codeType)}, ${quote(strand.name)}, ${strand.displayOrder})`,
    )
    .join(",\n");
  return `insert into public.strand (doc_id, code, code_type, name, display_order)\nvalues\n${values};\n`;
}

function insertStandards(standards: StandardRecord[]): string {
  const groups = chunk(standards, 40);
  return groups
    .map((group) => {
      const values = group
        .map((standard) => {
          const parent = standard.parentCode
            ? `(select id from public.standard where doc_id = (select id from public.curriculum_doc where doc_key = ${quote(standard.docKey)}) and grade = ${standard.grade} and code = ${quote(standard.parentCode)})`
            : "null";
          return `  ((select id from public.curriculum_doc where doc_key = ${quote(standard.docKey)}), (select id from public.strand where doc_id = (select id from public.curriculum_doc where doc_key = ${quote(standard.docKey)}) and code = ${quote(standard.strandCode)}), ${standard.grade}, ${quote(standard.code)}, ${quote(standard.codeType)}, ${sqlValue(standard.sourceSystemId)}, ${quote(standard.level)}, ${parent}, ${quote(standard.text)}, ${quote(JSON.stringify(standard.extra))}::jsonb, ${quote(standard.sourceUrl)}, ${standard.displayOrder}, ${standard.needsReview ? "true" : "false"}, ${quote(standard.lastVerified)}::date)`;
        })
        .join(",\n");
      return `insert into public.standard (doc_id, strand_id, grade, code, code_type, source_system_id, level, parent_id, text, extra, source_url, display_order, needs_review, last_verified)\nvalues\n${values};\n`;
    })
    .join("\n");
}

function insertSkills(skills: SkillRecord[]): string {
  if (skills.length === 0) return "";
  const values = skills
    .map((skill) => `  (${quote(skill.slug)}, ${quote(skill.title)}, ${sqlValue(skill.description)})`)
    .join(",\n");
  return `insert into public.skill (slug, title, description)\nvalues\n${values}\non conflict (slug) do update set title = excluded.title;\n`;
}

function insertAlignments(alignments: AlignmentRecord[]): string {
  if (alignments.length === 0) return "";
  const values = alignments
    .map(
      (alignment) =>
        `  ((select id from public.skill where slug = ${quote(alignment.skillSlug)}), (select id from public.standard where doc_id = (select id from public.curriculum_doc where doc_key = ${quote(alignment.docKey)}) and grade = ${alignment.grade} and code = ${quote(alignment.code)}), ${quote(alignment.strength)}, ${sqlValue(alignment.note)})`,
    )
    .join(",\n");
  return `insert into public.alignment (skill_id, standard_id, strength, note)\nvalues\n${values}\non conflict (skill_id, standard_id) do update set strength = excluded.strength, note = excluded.note;\n`;
}

function insertSequence(sequence: SequenceRecord, items: SequenceItemRecord[]): string {
  const itemValues = items
    .map((item) => {
      const [docKey, grade, code] = item.standardId.split(":");
      const skill = item.skillSlug ? `(select id from public.skill where slug = ${quote(item.skillSlug)})` : "null";
      return `  ((select id from public.sequence where jurisdiction_code = ${quote(sequence.jurisdiction)} and grade = ${sequence.grade} and version = ${sequence.version}), ${item.position}, ${quote(item.blockTitle)}, ${item.approxWeeks ?? "null"}, (select id from public.standard where doc_id = (select id from public.curriculum_doc where doc_key = ${quote(docKey)}) and grade = ${grade} and code = ${quote(code)}), ${skill}, ${item.isSpiral ? "true" : "false"})`;
    })
    .join(",\n");
  return `insert into public.sequence (jurisdiction_code, grade, doc_id, label, basis, version, effective_from, effective_to, is_published)
values (
  ${quote(sequence.jurisdiction)},
  ${sequence.grade},
  (select id from public.curriculum_doc where doc_key = ${quote(sequence.docKey)}),
  ${quote(sequence.label)},
  ${quote(sequence.basis)},
  ${sequence.version},
  ${quote(sequence.effectiveFrom)}::date,
  ${sequence.effectiveTo ? `${quote(sequence.effectiveTo)}::date` : "null"},
  ${sequence.isPublished ? "true" : "false"}
);

insert into public.sequence_item (sequence_id, position, block_title, approx_weeks, standard_id, skill_id, is_spiral)
values
${itemValues};
`;
}

function header(purpose: string): string {
  return `-- ${purpose}\n-- Not applied to the hosted Supabase project. Apply after review, after 20261018040000.\n\n`;
}

function publish(codes: string[]): string {
  return `update public.jurisdiction set publish_status = 'published' where code in (${codes.map(quote).join(", ")});\n`;
}

const standardsByDoc = (docKey: string) => catalog.standards.filter((standard) => standard.docKey === docKey);
const strandsByDoc = (docKey: string) => catalog.strands.filter((strand) => strand.docKey === docKey);
const alignmentsByDoc = (docKey: string) => catalog.alignments.filter((alignment) => alignment.docKey === docKey);
const skillSlugs = (docKey: string) => new Set(alignmentsByDoc(docKey).map((alignment) => alignment.skillSlug));

function skillsFor(docKey: string, exclude: Set<string>): SkillRecord[] {
  return catalog.skills.filter((skill) => skillSlugs(docKey).has(skill.slug) && !exclude.has(skill.slug));
}

mkdirSync(root, { recursive: true });

const ontarioSkills = catalog.skills.filter((skill) => catalog.alignments.some((alignment) => alignment.skillSlug === skill.slug && alignment.docKey === "ON-MATH-2020"));
const ontarioOveralls = standardsByDoc("ON-MATH-2020").filter((standard) => standard.level === "overall");
const ontarioSpecifics = standardsByDoc("ON-MATH-2020").filter((standard) => standard.level === "specific");

writeFileSync(
  join(root, "20261018050000_ontario_curriculum.sql"),
  header("Ontario 2020 expectations, corrected skills, and alignments.") +
    insertStrands(strandsByDoc("ON-MATH-2020")) +
    "\n" +
    insertStandards(ontarioOveralls) +
    "\n" +
    insertStandards(ontarioSpecifics) +
    "\n" +
    insertSkills(ontarioSkills) +
    "\n" +
    insertAlignments(alignmentsByDoc("ON-MATH-2020")),
);

writeFileSync(
  join(root, "20261018050100_ontario_sequence.sql"),
  header("Ontario Grade 3 suggested teaching sequence.") + insertSequence(catalog.sequences[0], catalog.sequenceItems),
);

const used = new Set(ontarioSkills.map((skill) => skill.slug));
function provinceFile(name: string, file: string, docKeys: string[], publishCodes: string[]) {
  const strands = docKeys.flatMap(strandsByDoc);
  const overalls = docKeys.flatMap((docKey) => standardsByDoc(docKey).filter((standard) => standard.parentCode == null));
  const children = docKeys.flatMap((docKey) => standardsByDoc(docKey).filter((standard) => standard.parentCode != null));
  const skills = docKeys.flatMap((docKey) => {
    const rows = skillsFor(docKey, used);
    for (const skill of rows) used.add(skill.slug);
    return rows;
  });
  const alignments = docKeys.flatMap(alignmentsByDoc);
  writeFileSync(
    join(root, file),
    header(name) +
      insertStrands(strands) +
      "\n" +
      insertStandards(overalls) +
      (children.length ? "\n" + insertStandards(children) : "") +
      "\n" +
      insertSkills(skills) +
      "\n" +
      insertAlignments(alignments) +
      "\n" +
      publish(publishCodes),
  );
}

provinceFile("British Columbia and Yukon standards. NWT stays coming soon.", "20261018050200_bc_yukon.sql", ["BC-MATH-K9-2016"], ["BC", "YT"]);
provinceFile("Alberta K-6 and legacy grades 7-8.", "20261018050300_alberta.sql", ["AB-MATH-K6-2022", "AB-MATH-K9-2016"], ["AB"]);
provinceFile("Saskatchewan and Manitoba outcomes.", "20261018050400_saskatchewan_manitoba.sql", ["SK-MATH-1-8", "MB-MATH-K8-2013"], ["SK", "MB"]);
provinceFile("Nova Scotia and Prince Edward Island outcomes. NL, NB, and Nunavut stay coming soon.", "20261018050500_nova_scotia_pei.sql", ["NS-MATH-2022", "PE-MATH-2024"], ["NS", "PE"]);

console.log("wrote migrations");
