import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";
import { StudyGate } from "@/components/study-session";

export default async function StudyCodePage(props: PageProps<"/study/[code]">) {
  const { code } = await props.params;
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <StudyGate initialCode={code} />
    </Shell>
  );
}
