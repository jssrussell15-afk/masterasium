import { StudentCanDo } from "@/components/can-do-list";
import { Shell } from "@/components/site-header";
import { sampleCanDo } from "@/lib/can-do/sample";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Things I can do sample",
};

export default async function CanDoSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const params = await searchParams;
  const view = sampleCanDo(params.empty === "1" ? "empty" : "filled", true);

  return (
    <Shell narrow role="student" action={null}>
      <p className="hint mt-4">Sample list. Not a real child.</p>
      <StudentCanDo view={view} />
    </Shell>
  );
}
