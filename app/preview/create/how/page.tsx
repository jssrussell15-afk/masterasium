import { HowCreateWorks } from "@/components/create/flow";
import { Shell } from "@/components/site-header";

export const metadata = { robots: { index: false, follow: false }, title: "How Create works" };

export default function PreviewHowPage() {
  return (
    <Shell narrow role="student" action={null} homeHref="/preview/create/home">
      <HowCreateWorks />
    </Shell>
  );
}
