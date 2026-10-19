import { ReteachFlow } from "@/components/reteach-flow";
import { Shell } from "@/components/site-header";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Re-teach sample",
};

const SCENES = ["base-ten", "number-line", "fraction", "in", "out", "parent"] as const;
type Scene = (typeof SCENES)[number];

export default async function ReteachPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const scene = (await searchParams).scene;
  const chosen: Scene = SCENES.includes(scene as Scene) ? (scene as Scene) : "base-ten";
  const role = chosen === "parent" ? "parent" : "student";
  return (
    <Shell role={role} homeHref="/preview/reteach">
      <div className="mt-6 grid gap-4">
        <p className="hint">Sample draft. A switch on this page is for review.</p>
        <ReteachFlow scene={chosen} />
      </div>
    </Shell>
  );
}
