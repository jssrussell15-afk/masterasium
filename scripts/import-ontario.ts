import ontario from "../data/curriculum/ontario-2020.json" with { type: "json" };
import corrections from "../data/curriculum/ontario-skill-corrections.json" with { type: "json" };
import { importOntarioSkills, importOntarioStandards } from "../lib/curriculum/ontario-import";

const standards = importOntarioStandards(ontario);
const { skills, alignments } = importOntarioSkills(corrections);
const specific = standards.filter((standard) => standard.level === "specific").length;

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(JSON.stringify({ standards: standards.length, specific, skills: skills.length, alignments: alignments.length }, null, 2));
}

export { alignments, skills, standards };
