import { PracticePreview } from "@/components/practice-preview";
import { Shell } from "@/components/site-header";
import { buildWorkedExample, type WorkedExample } from "@/lib/practice/example";
import { workedExamplePool } from "@/lib/practice/example-pool";
import { skillsForGrade } from "@/lib/practice/skills";
import type { SkillProgress } from "@/lib/practice/types";

const VIEWS = ["intro", "question", "retry", "revealed", "correct", "example", "help", "home", "play"] as const;
type PreviewView = (typeof VIEWS)[number];

export const metadata = {
  robots: { index: false, follow: false },
  title: "Practice sample",
};

const COUNTING_EXAMPLE: WorkedExample = {
  prompt: "What number comes just after 4?",
  steps: ["Count one more than 4.", "4 and one more is 5."],
  answer: "5",
};

export default async function PracticeSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; grade?: string; sample?: string }>;
}) {
  const params = await searchParams;
  const view: PreviewView = VIEWS.includes(params.view as PreviewView) ? (params.view as PreviewView) : "question";
  const grade = params.grade === "5" ? 5 : params.grade === "2" ? 2 : params.grade === "1" ? 1 : 3;
  const sample = params.sample === "place" ? "place" : params.sample === "fraction" ? "fraction" : "default";
  const picked = pickSample(grade, sample);
  const examples = picked.pool
    ? workedExamplePool({ skillId: picked.skillId, livePrompt: picked.livePrompt, liveAnswer: picked.liveAnswer })
    : null;
  const example = picked.example ?? examples?.[0] ?? buildWorkedExample({ skillId: "g1-add-10", livePrompt: "6 + 2 = ?" });
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
      <PracticePreview
        view={view}
        example={example}
        examples={examples}
        skillId={picked.skillId}
        sample={sample}
        skills={skills}
        grade={grade}
      />
    </Shell>
  );
}

function pickSample(grade: 1 | 2 | 3 | 5, sample: "default" | "place" | "fraction") {
  if (grade === 1 && sample === "place") {
    return {
      skillId: "g1-place",
      pool: true,
      livePrompt: "In 77, what is the value of the tens digit?",
      liveAnswer: "70",
      example: null,
    };
  }
  if (grade === 5 && sample === "place") {
    return {
      skillId: "g5-place",
      pool: true,
      livePrompt: "In 54,083, what is the value of the ten-thousands digit?",
      liveAnswer: "50000",
      example: null,
    };
  }
  if (grade === 5 || sample === "fraction") {
    return {
      skillId: "g5-frac",
      pool: true,
      livePrompt: "3/8 + 2/8 = ?",
      liveAnswer: "5/8",
      example: null,
    };
  }
  if (grade === 1) {
    return { skillId: "g1-count", pool: false, livePrompt: "", liveAnswer: "", example: COUNTING_EXAMPLE };
  }
  if (grade === 2) {
    return {
      skillId: "g2-add-sub",
      pool: false,
      livePrompt: "",
      liveAnswer: "",
      example: buildWorkedExample({ skillId: "g2-add-sub", livePrompt: "23 + 14 = ?" }),
    };
  }
  return {
    skillId: "g1-add-10",
    pool: false,
    livePrompt: "",
    liveAnswer: "",
    example: buildWorkedExample({ skillId: "g1-add-10", livePrompt: "6 + 2 = ?" }),
  };
}
