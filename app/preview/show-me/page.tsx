import { QuestionPractice } from "@/components/question-practice";
import { Shell } from "@/components/site-header";
import { generateQuestion } from "@/lib/practice/generate";
import { focusEyebrow } from "@/lib/practice/skills";
import type { Question } from "@/lib/practice/types";
import type { Walkthrough } from "@/lib/practice/walk";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Show me sample",
};

const SCENES = ["help", "hint", "add-1", "add-2", "add-3", "add-4", "handoff", "sub", "mult", "frac", "time"] as const;
type Scene = (typeof SCENES)[number];

export default async function ShowMeSamplePage({
  searchParams,
}: {
  searchParams: Promise<{ scene?: string }>;
}) {
  const params = await searchParams;
  const scene: Scene = SCENES.includes(params.scene as Scene) ? (params.scene as Scene) : "help";
  const frame = frameFor(scene);

  return (
    <Shell narrow role="student" action={null} homeHref="/preview/show-me?scene=help">
      <div className="question-screen">
      <QuestionPractice
        questionId={`${scene}-${frame.question.prompt}`}
        eyebrow={focusEyebrow(frame.question.skillId)}
        prompt={frame.question.prompt}
        responseHint={null}
        shape={{
          kind: "single",
          inputMode: frame.question.answer.includes(":") || frame.question.answer.includes("/") ? "text" : "numeric",
        }}
        hint="Add the ones first."
        example={scene === "help" ? { prompt: "20 + 15 = ?", steps: ["Add the ones."], answer: "35" } : null}
        progress={{ index: 1, total: 10 }}
        phase={frame.phase}
        why={null}
        steps={[]}
        expected={frame.phase === "revealed" ? frame.question.answer : null}
        walk={frame.question.walk}
        walkStart={frame.walkStart}
      />
      </div>
    </Shell>
  );
}

function frameFor(scene: Scene): {
  question: Question;
  phase: "answering" | "revealed";
  walkStart: { step: number; handoff?: boolean; hint?: boolean } | null;
} {
  const addition = sample("g3-add-sub", (question) => question.prompt.includes("+") && Boolean(question.walk));
  if (scene === "help") return { question: addition, phase: "answering", walkStart: null };
  if (scene === "hint") return { question: addition, phase: "answering", walkStart: { step: 0, hint: true } };
  if (scene === "handoff") return { question: addition, phase: "revealed", walkStart: { step: 0, handoff: true } };
  if (scene.startsWith("add-")) {
    const step = Number(scene.slice(4)) - 1;
    return { question: addition, phase: "revealed", walkStart: { step } };
  }
  if (scene === "sub") {
    return {
      question: sample("g3-add-sub", (question) => question.prompt.includes("−") && Boolean(question.walk)),
      phase: "revealed",
      walkStart: { step: 1 },
    };
  }
  if (scene === "mult") {
    return { question: sample("g3-mult", (question) => Boolean(question.walk)), phase: "revealed", walkStart: { step: 1 } };
  }
  if (scene === "frac") {
    return {
      question: sample("g3-fractions", (question) => Boolean(question.walk)),
      phase: "revealed",
      walkStart: { step: 1 },
    };
  }
  return { question: sample("g3-time", (question) => Boolean(question.walk)), phase: "revealed", walkStart: { step: 0 } };
}

function sample(skillId: string, accept: (question: Question) => boolean): Question & { walk: Walkthrough } {
  const rng = mulberry32(11);
  for (let index = 0; index < 80; index += 1) {
    const question = generateQuestion(skillId, rng);
    if (question.walk && accept(question)) return question as Question & { walk: Walkthrough };
  }
  throw new Error(`No Show me sample for ${skillId}.`);
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
