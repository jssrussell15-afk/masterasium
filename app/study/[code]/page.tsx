import { Shell } from "@/components/site-header";
import { StudyGate } from "@/components/study-session";

export default async function StudyCodePage(props: PageProps<"/study/[code]">) {
  const { code } = await props.params;
  return (
    <Shell narrow>
      <StudyGate initialCode={code} />
    </Shell>
  );
}
