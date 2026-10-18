import { StrategyDesk } from "@/components/strategy-desk";
import { Shell } from "@/components/site-header";
import { strategyLines, type TaggedAnswer } from "@/lib/strategy/desk";
import type { Strategy } from "@/lib/strategy/types";

export const metadata = {
  robots: { index: false, follow: false },
  title: "How they're solving it",
};

const SCENES = ["pattern", "mixed", "few"] as const;
type Scene = (typeof SCENES)[number];

function fill(skillId: string, strategy: Strategy, count: number): TaggedAnswer[] {
  return Array.from({ length: count }, () => ({ skillId, strategy }));
}

function answersFor(scene: Scene): TaggedAnswer[] {
  if (scene === "pattern") return fill("g3-add-sub", "counting_on", 8);
  if (scene === "mixed") {
    return [...fill("g2-add-sub", "counting_on", 4), ...fill("g1-sub-10", "number_line", 4)];
  }
  return fill("g3-add-sub", "counting_on", 3);
}

export default async function StrategyPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const scene = (await searchParams).scene;
  const chosen: Scene = SCENES.includes(scene as Scene) ? (scene as Scene) : "pattern";
  const lines = strategyLines(answersFor(chosen));
  return (
    <Shell role="parent" homeHref="/preview/strategy">
      <article className="card mt-6 grid gap-4">
        <h1 className="text-2xl font-semibold">Sam</h1>
        <p className="hint">Enrolled in Grade 3</p>
        <StrategyDesk lines={lines} />
      </article>
    </Shell>
  );
}
