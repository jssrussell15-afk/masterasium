"use client";

import { useState } from "react";
import { AnswerFields } from "@/components/answer-fields";
import { answersMatch } from "@/lib/practice/answers";
import { classifyMistake } from "@/lib/practice/mistakes";
import { answerShape, givenAnswer } from "@/lib/practice/parts";
import { openPracticeSet } from "@/lib/worksheets/actions";
import { normalizeAccessCode } from "@/lib/worksheets/code";
import { readLocalSet } from "@/lib/worksheets/local";
import { exampleForMistake, shouldTeach } from "@/lib/worksheets/teach";
import type { PracticeSet, WorkedExample } from "@/lib/worksheets/types";

type Feedback = {
  correct: boolean;
  expected?: string;
  steps?: string[];
  note?: string;
  example?: WorkedExample | null;
};

export function StudyGate({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [set, setSet] = useState<PracticeSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function open(formData: FormData) {
    setPending(true);
    setError(null);
    const entered = normalizeAccessCode(String(formData.get("code") ?? ""));
    if (entered.length < 4) {
      setError("Enter the access code from your teacher.");
      setPending(false);
      return;
    }
    const remote = await openPracticeSet(entered);
    const practice = remote ?? readLocalSet(entered);
    if (!practice) {
      setError("That code does not match a practice set.");
      setSet(null);
      setPending(false);
      return;
    }
    setSet(practice);
    setPending(false);
  }

  if (!set) {
    return (
      <form action={open} className="card mt-8 grid gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Open a practice set</h1>
          <p className="hint mt-2 text-sm">
            Enter the code from your teacher. This is practice on your screen. Nothing is sent back.
          </p>
        </div>
        <label className="field">
          Access code
          <input
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            autoComplete="off"
            autoCapitalize="characters"
            required
          />
        </label>
        <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
          {pending ? "Opening…" : "Open practice set"}
        </button>
        {error ? (
          <p className="feedback bad" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    );
  }

  return <StudyPractice practice={set} />;
}

function StudyPractice({ practice }: { practice: PracticeSet }) {
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const item = practice.items[index];
  const finished = index >= practice.items.length;

  function check(formData: FormData) {
    if (!item) return;
    const given = givenAnswer(item.answer, {
      answer: String(formData.get("answer") ?? ""),
      remainder: String(formData.get("remainder") ?? ""),
    });
    const correct = answersMatch(item.answer, given);
    if (correct) {
      setFeedback({ correct: true });
      return;
    }
    const mistake = classifyMistake(item.prompt, item.answer, given);
    const count = (counts[mistake.type] ?? 0) + 1;
    setCounts({ ...counts, [mistake.type]: count });
    const teach = shouldTeach(mistake.type, count);
    setFeedback({
      correct: false,
      expected: item.answer,
      steps: item.steps,
      note: teach ? mistake.note : undefined,
      example: teach ? exampleForMistake(mistake.type, item.example) : undefined,
    });
  }

  if (finished || !item) {
    return (
      <section className="card mt-8 grid gap-3">
        <h1 className="text-2xl font-semibold">Practice set complete</h1>
        <p>Nothing was sent to your teacher. You can close this page.</p>
      </section>
    );
  }

  return (
    <div className="mt-6 grid gap-6">
      <div>
        {practice.logoData ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo is a data URL stored with the practice set; next/image does not optimize data URLs
          <img src={practice.logoData} alt="" className="study-logo" />
        ) : null}
        <p className="eyebrow mt-3">Practice · {practice.code}</p>
        <h1 className="mt-2 text-3xl font-semibold">{practice.title}</h1>
        {practice.subtitle ? <p className="hint mt-1">{practice.subtitle}</p> : null}
        {practice.instructions ? <p className="lede mt-3 text-base">{practice.instructions}</p> : null}
        <p className="hint mt-3 text-sm">
          Question {index + 1} of {practice.items.length}. Nothing is sent to your teacher.
        </p>
      </div>

      <div>
        <h2 className={item.prompt.length > 60 ? "prompt prompt-long" : "prompt"}>{item.prompt}</h2>
      </div>

      {feedback ? (
        <div className={feedback.correct ? "feedback good" : "feedback bad"} role="status">
          {feedback.correct ? (
            <p>That&apos;s right.</p>
          ) : (
            <>
              <p>The answer is {feedback.expected}.</p>
              {feedback.steps && feedback.steps.length > 0 ? (
                <ol className="steps">
                  {feedback.steps.map((step, stepIndex) => (
                    <li key={`step-${stepIndex}`}>{step}</li>
                  ))}
                </ol>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {feedback && !feedback.correct && feedback.note ? (
        <section className="lesson">
          <p>{feedback.note}</p>
          {feedback.example ? (
            <>
              <p className="mt-3">
                <strong>Example.</strong> {feedback.example.prompt}
              </p>
              <ol className="steps">
                {feedback.example.steps.map((step, stepIndex) => (
                  <li key={`example-${stepIndex}`}>{step}</li>
                ))}
              </ol>
              <p className="mt-2">Answer: {feedback.example.answer}</p>
            </>
          ) : null}
        </section>
      ) : null}

      {feedback ? (
        <button
          type="button"
          className="btn btn-primary w-fit"
          onClick={() => {
            setFeedback(null);
            setIndex((current) => current + 1);
          }}
        >
          {index + 1 === practice.items.length ? "Finish" : "Next question"}
        </button>
      ) : (
        <form key={`${index}-${item.prompt}`} action={check} className="grid gap-3">
          <AnswerFields shape={answerShape(item.prompt, item.answer)} />
          <button className="btn btn-primary w-fit" type="submit">
            Check
          </button>
        </form>
      )}
    </div>
  );
}
