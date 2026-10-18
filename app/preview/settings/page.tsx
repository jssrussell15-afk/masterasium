import { SetPinForm } from "@/components/student-access-forms";
import { Shell } from "@/components/site-header";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Settings sample",
};

export default async function SettingsSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  const notice = params.notice;

  return (
    <Shell role="parent" action={null}>
      <div className="mt-6 grid gap-6">
        <div>
          <p className="eyebrow">Parent account</p>
          <h1 className="display mt-2 text-4xl">Account settings</h1>
          <p className="hint mt-2">Sample settings. Not a real account.</p>
        </div>
        <section className="card grid gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Sam</h2>
            <p className="hint mt-1">Enrolled in Grade 3</p>
          </div>
          <div className="grid gap-3">
            <h3 className="text-xl font-semibold">Student sign-in</h3>
            <SetPinForm
              childId="00000000-0000-4000-8000-000000000001"
              firstName="Sam"
              hasLogin
              returnTo="settings"
              saved={notice === "pin"}
            />
          </div>
        </section>
      </div>
    </Shell>
  );
}
