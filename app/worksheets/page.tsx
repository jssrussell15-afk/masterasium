import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { WorksheetBuilder } from "@/components/worksheet-builder";
import { SKILLS } from "@/lib/practice/skills";
import { listTemplates } from "@/lib/worksheets/actions";

export default async function WorksheetsPage() {
  const { templates, error } = await listTemplates();
  const skills = SKILLS.map((skill) => ({
    id: skill.id,
    grade: skill.grade,
    title: skill.title,
  }));

  return (
    <Shell role="parent" action={<SignOutButton />}>
      <WorksheetBuilder skills={skills} initialTemplates={templates} storageError={error} />
    </Shell>
  );
}
