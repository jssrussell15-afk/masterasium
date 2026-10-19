"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroModal } from "@/components/intro-modal";
import { QuestionPractice } from "@/components/question-practice";
import { StudentDashboard } from "@/components/student-dashboard";
import { freshFeedback, reduceFeedback, type FeedbackPhase } from "@/lib/practice/feedback";
import type { WorkedExample } from "@/lib/practice/example";
import type { SkillProgress } from "@/lib/practice/types";

const QUESTIONS = [
  {
    id: "preview-1",
    prompt: "6 + 2 = ?",
    answer: "8",
    hint: "Start at 6 and count on 2.",
    why: "Start at 6 and count on 2.",
    steps: ["Start at 6 and count on 2.", "6 + 2 = 8."],
  },
  {
    id: "preview-2",
    prompt: "3 + 4 = ?",
    answer: "7",
    hint: "Start at 3 and count on 4.",
    why: "Start at 3 and count on 4.",
    steps: ["Start at 3 and count on 4.", "3 + 4 = 7."],
  },
] as const;

export function PracticePreview({
  view,
  example,
  skills,
}: {
  view: "intro" | "question" | "retry" | "revealed" | "correct" | "example" | "home" | "play";
  example: WorkedExample | null;
  skills: SkillProgress[];
}) {
  if (view === "home") {
    return (
      <StudentDashboard
        childId="preview-child"
        childName="Sam"
        grade={1}
        home={{
          assigned: [],
          recommended: skills.slice(0, 2).map((skill) => ({
            id: skill.id,
            title: skill.title,
            grade: 1,
            note: skill.summary,
          })),
          recent: [],
        }}
        skills={skills}
        access={{ enrolled: 1, working: 1, nextUnlocked: false, requested: null }}
        requestedGrade={null}
      />
    );
  }

  if (view === "play") return <Playground example={example} />;

  if (view === "intro") {
    return (
      <div className="question-screen">
        <p className="question-back">
          <Link className="home-link" href="/preview/practice?view=home">
            All skills
          </Link>
        </p>
        <IntroModal
          title="Addition within 10"
          sentences={[
            "Add two numbers whose sum is 10 or less.",
            "Put the numbers together and count the total.",
          ]}
          example={{
            prompt: "4 + 3 = ?",
            steps: ["Start at 4 and count on 3."],
            answer: "7",
          }}
          onViewed={() => undefined}
          onFinished={() => undefined}
        />
      </div>
    );
  }

  const phase: FeedbackPhase =
    view === "retry" ? "retry" : view === "revealed" ? "revealed" : view === "correct" ? "correct" : "answering";
  const question = QUESTIONS[0];

  return (
    <Screen
      questionId={`${question.id}-${view}`}
      prompt={question.prompt}
      hint={question.hint}
      example={example}
      phase={phase}
      why={phase === "correct" ? question.why : null}
      steps={phase === "revealed" ? [...question.steps] : []}
      expected={phase === "revealed" ? question.answer : null}
      draft={view === "retry" ? "5" : view === "correct" ? "8" : ""}
      exampleStartsOpen={view === "example"}
      progress={1}
    />
  );
}

function Playground({ example }: { example: WorkedExample | null }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState(freshFeedback());
  const question = QUESTIONS[index] ?? QUESTIONS[0];

  function act(formData: FormData) {
    const intent = String(formData.get("intent") ?? "check");
    if (intent === "next") {
      const result = reduceFeedback(feedback, { type: "next" });
      if (!result.advance) return;
      setFeedback(freshFeedback());
      setIndex((current) => (current + 1) % QUESTIONS.length);
      return;
    }
    if (intent === "show-how") {
      setFeedback(reduceFeedback(feedback, { type: "show-how" }).state);
      return;
    }
    const given = String(formData.get("answer") ?? "").trim();
    setFeedback(reduceFeedback(feedback, { type: "check", correct: given === question.answer }).state);
  }

  const phase = feedback.phase;
  return (
    <Screen
      questionId={question.id}
      prompt={question.prompt}
      hint={question.hint}
      example={example}
      phase={phase}
      why={phase === "correct" ? question.why : null}
      steps={phase === "revealed" ? [...question.steps] : []}
      expected={phase === "revealed" ? question.answer : null}
      action={act}
      progress={index + 1}
    />
  );
}

function Screen({
  questionId,
  prompt,
  hint,
  example,
  phase,
  why,
  steps,
  expected,
  draft = "",
  exampleStartsOpen = false,
  progress,
  action,
}: {
  questionId: string;
  prompt: string;
  hint: string;
  example: WorkedExample | null;
  phase: FeedbackPhase;
  why: string | null;
  steps: string[];
  expected: string | null;
  draft?: string;
  exampleStartsOpen?: boolean;
  progress: number;
  action?: (formData: FormData) => void;
}) {
  return (
    <div className="question-screen">
      <p className="question-back">
        <Link className="home-link" href="/preview/practice?view=home">
          All skills
        </Link>
      </p>
      <QuestionPractice
        key={questionId}
        questionId={questionId}
        eyebrow="Focus · Addition within 10"
        prompt={prompt}
        responseHint={null}
        shape={{ kind: "single", inputMode: "numeric" }}
        hint={hint}
        example={example}
        progress={{ index: progress, total: 10 }}
        phase={phase}
        why={why}
        steps={steps}
        expected={expected}
        draft={draft}
        exampleStartsOpen={exampleStartsOpen}
        action={action ?? (() => undefined)}
      />
    </div>
  );
}
