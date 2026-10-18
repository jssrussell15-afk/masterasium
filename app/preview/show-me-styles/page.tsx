import { ShowMeStyles } from "@/components/show-me-styles";
import { Shell } from "@/components/site-header";
import { sampleTemplate } from "@/lib/show-me/templates";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Show me styles",
};

const SCENES = ["guided", "standard", "buggy", "fix", "fallback"] as const;

export default async function ShowMeStylesPage({
  searchParams,
}: {
  searchParams: Promise<{ style?: string }>;
}) {
  const style = (await searchParams).style ?? "guided";
  const scene = SCENES.includes(style as (typeof SCENES)[number]) ? (style as (typeof SCENES)[number]) : "guided";
  return (
    <Shell role="public" homeHref="/preview/show-me-styles">
      <div className="mt-6 grid gap-4">
        <p className="hint">Sample draft. A style switch on this page is for review.</p>
        <ShowMeStyles template={sampleTemplate()} scene={scene} />
      </div>
    </Shell>
  );
}
