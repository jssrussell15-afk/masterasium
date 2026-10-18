import { Phase1Card } from "@/components/phase1-card";
import { Shell } from "@/components/site-header";
import { phase1Sample } from "@/lib/content/phase1/catalog";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Phase 1 sample",
};

const KINDS = ["open", "bar", "estimate", "explain", "mistake", "logic", "puzzle", "weekly"] as const;

export default async function Phase1SamplePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const type = (await searchParams).type ?? "open";
  const kind = KINDS.includes(type as (typeof KINDS)[number]) ? type : "open";
  const row = phase1Sample(kind);
  return (
    <Shell role="public" homeHref="/preview/phase1">
      <div className="mt-6">
        <p className="hint mb-3">Sample draft. Not served in practice.</p>
        <Phase1Card item={row} skillLabel={row.skillLabel} topic={row.topic} />
      </div>
    </Shell>
  );
}
