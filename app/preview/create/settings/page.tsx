import { CreateSettingsForm } from "@/components/create/settings-form";
import { Shell } from "@/components/site-header";
import { DEFAULT_CREATE_FLAGS } from "@/lib/create/types";

export const metadata = { robots: { index: false, follow: false }, title: "Create settings sample" };

export default function PreviewCreateSettings() {
  return (
    <Shell role="parent" action={null}>
      <div className="mt-6 grid gap-6">
        <div>
          <p className="eyebrow">Parent account</p>
          <h1 className="display mt-2 text-4xl">Account settings</h1>
        </div>
        <section className="card grid gap-4">
          <h2 className="text-2xl font-semibold">Sam</h2>
          <p className="hint">Enrolled in Grade 3</p>
          <CreateSettingsForm
            childId="preview-child"
            childName="Sam"
            initial={DEFAULT_CREATE_FLAGS}
            consentHref="/preview/create/consent"
            localOnly
          />
        </section>
      </div>
    </Shell>
  );
}
