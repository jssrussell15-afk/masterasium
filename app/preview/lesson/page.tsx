import { LessonView } from "@/components/lesson-session";
import { Shell } from "@/components/site-header";
import { lessonById } from "@/lib/lesson/catalog";
import { freshRun, type LessonRun } from "@/lib/lesson/flow";
import { buildLessonScreen } from "@/lib/lesson/screen";
import { skillById } from "@/lib/practice/skills";

const SCREENS = ["intro", "worked", "question", "feedback", "complete"] as const;
type SampleScreen = (typeof SCREENS)[number];

export const metadata = {
  robots: { index: false, follow: false },
  title: "Lesson sample",
};

export default async function LessonSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string }>;
}) {
  const params = await searchParams;
  const name = SCREENS.includes(params.screen as SampleScreen) ? (params.screen as SampleScreen) : "intro";
  const skill = skillById("g3-place");
  const lesson = lessonById("g3-place");
  if (!skill || !lesson) return null;
  const screen = sampleScreen(name, skill.id);
  const view = buildLessonScreen(screen, skill, lesson, { nextReview: "2026-10-19" });
  const next = nextSample(name);

  return (
    <Shell narrow role="student" action={null}>
      <p className="hint mt-4">Sample lesson. Not a real child.</p>
      <LessonView screen={view} sampleHref={next ? `/preview/lesson?screen=${next}` : undefined} />
    </Shell>
  );
}

function sampleScreen(name: SampleScreen, skillId: string): LessonRun {
  const base = freshRun(skillId);
  if (name === "intro") return base;
  if (name === "worked") return { ...base, stage: "worked" };
  if (name === "question") return { ...base, stage: "faded", stepIndex: 0 };
  if (name === "feedback") {
    return {
      ...base,
      stage: "practice",
      feedbackNote: "The numbers were added. This question uses a different operation.",
      feedbackExpected: "400",
    };
  }
  return { ...base, stage: "complete" };
}

function nextSample(name: SampleScreen): SampleScreen | null {
  const index = SCREENS.indexOf(name);
  return SCREENS[index + 1] ?? null;
}
