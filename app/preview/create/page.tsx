import { CreateExperience } from "@/components/create/flow";
import { Shell } from "@/components/site-header";
import { DEFAULT_CREATE_FLAGS } from "@/lib/create/types";

export const metadata = { robots: { index: false, follow: false }, title: "Create sample" };

const access = { ...DEFAULT_CREATE_FLAGS, enabled: true, writeOwn: true };

export default function PreviewCreatePage() {
  return (
    <Shell narrow role="student" action={null} homeHref="/preview/create/home">
      <CreateExperience
        basePath="/preview/create"
        childId="preview-child"
        step="pick"
        project={null}
        access={access}
        homeHref="/preview/create/home"
      />
    </Shell>
  );
}
