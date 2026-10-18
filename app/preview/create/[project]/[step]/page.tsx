import { CreateExperience } from "@/components/create/flow";
import { Shell } from "@/components/site-header";
import { DEFAULT_CREATE_FLAGS, isProject, isStep, type CreateStep, type ProjectType } from "@/lib/create/types";

export const metadata = { robots: { index: false, follow: false }, title: "Create step sample" };

const access = { ...DEFAULT_CREATE_FLAGS, enabled: true, writeOwn: true };

export default async function PreviewCreateStep({
  params,
}: {
  params: Promise<{ project: string; step: string }>;
}) {
  const { project, step } = await params;
  return (
    <Shell narrow role="student" action={null} homeHref="/preview/create/home">
      {isProject(project) && isStep(step) && step !== "pick" ? (
        <CreateExperience
          basePath="/preview/create"
          childId="preview-child"
          step={step as CreateStep}
          project={project as ProjectType}
          access={access}
          homeHref="/preview/create/home"
        />
      ) : (
        <p className="hint mt-8">Pick a project on the Create screen.</p>
      )}
    </Shell>
  );
}
