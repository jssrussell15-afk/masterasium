import type { AlignmentRecord, SequenceItemRecord, SequenceRecord, StandardRecord } from "@/lib/curriculum/records";

export type SequenceFile = {
  jurisdiction: string;
  grade: number;
  label: string;
  basis: string;
  spiral_every_block: { code: string; title: string }[];
  spiral_from_block: { block: number; code: string; title: string };
  blocks: { position: number; title: string; approx_weeks: number; codes: string[] }[];
};

export function importOntarioSequence(
  file: SequenceFile,
  standards: StandardRecord[],
  alignments: AlignmentRecord[],
): { sequence: SequenceRecord; items: SequenceItemRecord[] } {
  const docKey = "ON-MATH-2020";
  const grade = file.grade;
  const sequence: SequenceRecord = {
    jurisdiction: file.jurisdiction,
    grade,
    docKey,
    label: file.label,
    basis: file.basis,
    version: 1,
    effectiveFrom: "2020-09-01",
    effectiveTo: null,
    isPublished: true,
  };
  const gradeStandards = standards.filter((standard) => standard.docKey === docKey && standard.grade === grade);
  const byCode = new Map(gradeStandards.map((standard) => [standard.code, standard]));
  const skillsFor = (code: string) =>
    alignments
      .filter((alignment) => alignment.docKey === docKey && alignment.grade === grade && alignment.code === code)
      .map((alignment) => alignment.skillSlug);

  const items: SequenceItemRecord[] = [];
  const seen = new Set<string>();
  const add = (item: SequenceItemRecord) => {
    const key = `${item.position}|${item.standardId}|${item.skillSlug ?? ""}|${item.isSpiral}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const block of file.blocks) {
    for (const code of block.codes) {
      const standard = byCode.get(code);
      if (!standard) throw new Error(`Sequence code ${code} is not a Grade ${grade} Ontario standard`);
      const slugs = skillsFor(code);
      if (slugs.length === 0) {
        add({
          position: block.position,
          blockTitle: block.title,
          approxWeeks: block.approx_weeks,
          standardId: standard.id,
          skillSlug: null,
          isSpiral: false,
        });
      } else {
        for (const skillSlug of slugs) {
          add({
            position: block.position,
            blockTitle: block.title,
            approxWeeks: block.approx_weeks,
            standardId: standard.id,
            skillSlug,
            isSpiral: false,
          });
        }
      }
    }
  }

  const spiralCodes = (position: number) => {
    const codes = file.spiral_every_block.map((item) => item.code);
    if (position >= file.spiral_from_block.block) codes.push(file.spiral_from_block.code);
    return codes;
  };

  for (const block of file.blocks) {
    for (const code of spiralCodes(block.position)) {
      const standard = byCode.get(code);
      if (!standard) throw new Error(`Spiral code ${code} is not a Grade ${grade} Ontario standard`);
      const mainSlugs = new Set(
        items.filter((item) => item.position === block.position && item.standardId === standard.id && !item.isSpiral).map((item) => item.skillSlug),
      );
      const slugs = skillsFor(code);
      if (slugs.length === 0) {
        add({
          position: block.position,
          blockTitle: block.title,
          approxWeeks: block.approx_weeks,
          standardId: standard.id,
          skillSlug: null,
          isSpiral: true,
        });
        continue;
      }
      for (const skillSlug of slugs) {
        const conflict = mainSlugs.has(skillSlug);
        add({
          position: block.position,
          blockTitle: block.title,
          approxWeeks: block.approx_weeks,
          standardId: standard.id,
          skillSlug: conflict ? null : skillSlug,
          isSpiral: true,
        });
      }
    }
  }

  return { sequence, items };
}
