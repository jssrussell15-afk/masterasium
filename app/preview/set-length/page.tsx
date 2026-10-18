import { PlaceToStop } from "@/components/place-to-stop";
import { SetLengthSetting } from "@/components/set-length-setting";
import { Shell } from "@/components/site-header";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Practice length sample",
};

const SCENES = ["setting", "stop"] as const;
type Scene = (typeof SCENES)[number];

export default async function SetLengthPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string; minutes?: string }>;
}) {
  const params = await searchParams;
  const scene: Scene = SCENES.includes(params.scene as Scene) ? (params.scene as Scene) : "setting";
  const minutes = params.minutes === "10" || params.minutes === "20" ? Number(params.minutes) : 15;

  return (
    <Shell narrow role={scene === "stop" ? "student" : "parent"} homeHref="/preview/set-length">
      {scene === "stop" ? (
        <div className="question-screen mt-4">
          <section className="question-card" aria-label="Question">
            <p className="topic-label">Focus · Addition and subtraction within 1,000</p>
            <h1 className="prompt">46 + 27 = ?</h1>
            <PlaceToStop minutes={minutes} reached />
          </section>
        </div>
      ) : (
        <article className="card grid gap-4 mt-4">
          <h1 className="text-2xl font-semibold">Sam</h1>
          <p className="hint">Enrolled in Grade 3</p>
          <SetLengthSetting childId="preview-child" minutes={minutes} preview />
        </article>
      )}
    </Shell>
  );
}
