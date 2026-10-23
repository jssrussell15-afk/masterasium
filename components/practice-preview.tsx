"use client";

import Link from "next/link";
import { useState } from "react";
import { IntroModal } from "@/components/intro-modal";
import { QuestionPractice } from "@/components/question-practice";
import { practiceChoices } from "@/lib/practice/choices";
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

const GRADE_ONE_PLACE = {
  id: "preview-place",
  prompt: "In 77, what is the value of the tens digit?",
  answer: "70",
  hint: "The tens digit tells how many groups of 10.",
  why: "The tens digit is 7, so its value is 7 × 10 = 70.",
  steps: ["The tens digit is 7.", "7 × 10 = 70."],
} as const;

const GRADE_FIVE_FRACTION = {
  id: "preview-frac",
  prompt: "3/8 + 2/8 = ?",
  answer: "5/8",
  hint: "Add the top numbers. Keep the bottom number.",
  why: "The parts match, so 3 + 2 = 5. The sum is 5/8.",
  steps: ["Both fractions have the same parts.", "Add the top numbers only.", "The sum is 5/8."],
} as const;

export function PracticePreview({
  view,
  example,
  examples = null,
  skillId = null,
  skills,
  grade = 3,
}: {
  view: "intro" | "question" | "retry" | "revealed" | "correct" | "example" | "home" | "play";
  example: WorkedExample | null;
  examples?: WorkedExample[] | null;
  skillId?: string | null;
  skills: SkillProgress[];
  grade?: 1 | 3 | 5;
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
  const question = grade === 5 ? GRADE_FIVE_FRACTION : grade === 1 ? GRADE_ONE_PLACE : QUESTIONS[0];
  const eyebrow =
    grade === 5
      ? "Focus · Adding and subtracting fractions with like denominators"
      : grade === 1
        ? "Focus · Place value (tens and ones)"
        : "Focus · Addition within 10";

  return (
    <Screen
      questionId={`${question.id}-${view}`}
      prompt={question.prompt}
      hint={question.hint}
      example={example}
      examples={examples}
      skillId={skillId}
      phase={phase}
      why={phase === "correct" ? question.why : null}
      steps={phase === "revealed" ? [...question.steps] : []}
      expected={phase === "revealed" ? question.answer : null}
      draft={view === "retry" ? "5" : view === "correct" ? question.answer : ""}
      exampleStartsOpen={view === "example"}
      progress={1}
      grade={grade}
      answer={question.answer}
      eyebrow={eyebrow}
      inputType={grade === 5 ? "fraction" : undefined}
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
      answer={question.answer}
    />
  );
}

function Screen({
  questionId,
  prompt,
  hint,
  example,
  examples = null,
  skillId = null,
  phase,
  why,
  steps,
  expected,
  draft = "",
  exampleStartsOpen = false,
  progress,
  action,
  grade = 3,
  eyebrow = "Focus · Addition within 10",
  answer,
  inputType,
}: {
  questionId: string;
  prompt: string;
  hint: string;
  example: WorkedExample | null;
  examples?: WorkedExample[] | null;
  skillId?: string | null;
  phase: FeedbackPhase;
  why: string | null;
  steps: string[];
  expected: string | null;
  draft?: string;
  exampleStartsOpen?: boolean;
  progress: number;
  action?: (formData: FormData) => void;
  grade?: 1 | 3 | 5;
  eyebrow?: string;
  answer: string;
  inputType?: "number" | "fraction";
}) {
  const choiceList = grade <= 2 ? practiceChoices(grade, prompt, answer, questionId) : null;
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
        eyebrow={eyebrow}
        prompt={prompt}
        responseHint={null}
        shape={{ kind: "single", inputMode: inputType === "fraction" ? "text" : "numeric" }}
        hint={hint}
        example={example}
        examples={examples}
        skillId={skillId}
        progress={{ index: progress, total: 10 }}
        phase={phase}
        why={why}
        steps={steps}
        expected={expected}
        draft={draft}
        exampleStartsOpen={exampleStartsOpen}
        action={action ?? (() => undefined)}
        grade={grade}
        autoRead={grade <= 2}
        inputType={inputType ?? (choiceList && choiceList.length >= 2 ? "choice" : "number")}
        choices={choiceList}
      />
    </div>
  );
}
