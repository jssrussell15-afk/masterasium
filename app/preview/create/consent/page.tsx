import { ConsentScreen } from "@/components/create/consent-screen";
import { Shell } from "@/components/site-header";

export const metadata = { robots: { index: false, follow: false }, title: "Create consent sample" };

export default function PreviewConsent() {
  return (
    <Shell role="parent" action={null}>
      <div className="mt-6">
        <ConsentScreen childName="Sam" initialAt={null} initialVersion={null} localOnly />
      </div>
    </Shell>
  );
}
