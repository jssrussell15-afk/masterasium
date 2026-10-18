import { MoveAheadSetting } from "@/components/move-ahead-setting";
import { Shell } from "@/components/site-header";
import { openNextUp, strandSkills } from "@/lib/practice/move-ahead";
import type { SkillCard } from "@/lib/practice/scheduler";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Let them move ahead sample",
};

const SCENES = ["off", "on", "next"] as const;
type Scene = (typeof SCENES)[number];

export default async function MoveAheadPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const params = await searchParams;
  const scene: Scene = SCENES.includes(params.scene as Scene) ? (params.scene as Scene) : "off";

  return (
    <Shell narrow role={scene === "next" ? "student" : "parent"} action={null} homeHref="/preview/move-ahead?scene=off">
      {scene === "next" ? <NextUpPreview /> : <SettingPreview enabled={scene === "on"} />}
    </Shell>
  );
}

function SettingPreview({ enabled }: { enabled: boolean }) {
  return (
    <article className="card grid gap-4 mt-4">
      <h1 className="text-2xl font-semibold">Sam</h1>
      <p className="hint">Enrolled in Grade 3</p>
      <MoveAheadSetting childId="preview-child" enabled={enabled} preview />
    </article>
  );
}

function NextUpPreview() {
  const ids = strandSkills(3, "number").map((skill) => skill.id);
  const cards: SkillCard[] = ids.map((skillId) => ({
    skillId,
    attempted: 10,
    correct: 10,
    streak: 0,
    fsrs: null,
  }));
  const open = openNextUp({
    moveAhead: true,
    province: "ON",
    grade: 3,
    cards,
    weekPassed: ids.map((skillId) => ({ skillId, passed: true })),
  });

  return (
    <div className="practice-home mt-4 grid gap-4" data-next-up="open">
      <div>
        <h1 className="display text-4xl">Sam</h1>
        <p className="hint mt-1">Grade 3</p>
      </div>
      <section className="card dash-widget" aria-label="Next up">
        <h2>Next up</h2>
        <ul className="skill-taps">
          {open.map((skill) => (
            <li key={skill.id}>
              <span className="skill-tap">
                <span>{skill.title}</span>
                <span className="hint">Next up</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
