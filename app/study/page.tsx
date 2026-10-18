import { sessionChrome } from "@/components/header-auth";
import { Shell } from "@/components/site-header";
import { StudyGate } from "@/components/study-session";

export default async function StudyPage() {
  const chrome = await sessionChrome();
  return (
    <Shell narrow {...chrome}>
      <StudyGate />
    </Shell>
  );
}
