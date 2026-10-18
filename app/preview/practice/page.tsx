import { PracticePreview } from "@/components/practice-preview";
import { Shell } from "@/components/site-header";
import { buildWorkedExample } from "@/lib/practice/example";
import { skillsForGrade } from "@/lib/practice/skills";
import type { SkillProgress } from "@/lib/practice/types";

const VIEWS = ["intro", "question", "retry", "revealed", "correct", "example", "home", "play"] as const;
type PreviewView = (typeof VIEWS)[number];

export const metadata = {
  robots: { index: false, follow: false },
  title: "Practice sample",
};

export default async function PracticeSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view: PreviewView = VIEWS.includes(params.view as PreviewView) ? (params.view as PreviewView) : "question";
  const example = buildWorkedExample({ skillId: "g1-add-10", livePrompt: "6 + 2 = ?" });
  const skills: SkillProgress[] = skillsForGrade(1).slice(0, 4).map((skill, index) => ({
    id: skill.id,
    grade: skill.grade,
    title: skill.title,
    summary: skill.summary,
    examplePrompt: skill.examplePrompt,
    exampleSteps: skill.exampleSteps,
    exampleAnswer: skill.exampleAnswer,
    status: index === 0 ? "practicing" : "not-started",
    checked: false,
    current: index === 0,
  }));

  return (
    <Shell narrow role="student" action={null} homeHref="/preview/practice?view=home">
      <PracticePreview view={view} example={example} skills={skills} />
    </Shell>
  );
}
