import { PracticePreview } from "@/components/practice-preview";
import { Shell } from "@/components/site-header";
import { buildWorkedExample } from "@/lib/practice/example";
import { workedExamplePool } from "@/lib/practice/example-pool";
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
  searchParams: Promise<{ view?: string; grade?: string }>;
}) {
  const params = await searchParams;
  const view: PreviewView = VIEWS.includes(params.view as PreviewView) ? (params.view as PreviewView) : "question";
  const grade = params.grade === "1" ? 1 : params.grade === "5" ? 5 : 3;
  const sample =
    grade === 5
      ? { skillId: "g5-frac", prompt: "3/8 + 2/8 = ?", answer: "5/8" }
      : grade === 1
        ? { skillId: "g1-place", prompt: "In 77, what is the value of the tens digit?", answer: "70" }
        : { skillId: "g1-add-10", prompt: "6 + 2 = ?", answer: "8" };
  const examples = grade === 1 || grade === 5
    ? workedExamplePool({ skillId: sample.skillId, livePrompt: sample.prompt, liveAnswer: sample.answer })
    : null;
  const example = examples?.[0] ?? buildWorkedExample({ skillId: "g1-add-10", livePrompt: "6 + 2 = ?" });
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
      <PracticePreview view={view} example={example} examples={examples} skillId={sample.skillId} skills={skills} grade={grade} />
    </Shell>
  );
}
