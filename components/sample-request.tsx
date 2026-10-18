"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { requestSample, type SampleState } from "@/lib/curriculum/sample-actions";
import type { CurriculumSkill } from "@/lib/curriculum/overview";

const initial: SampleState = {};

export function SampleRequest({
  province,
  provinceName,
  grade,
  skills,
}: {
  province: string;
  provinceName: string;
  grade: number;
  skills: CurriculumSkill[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(requestSample, initial);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Print sample questions
      </button>
      <dialog
        ref={dialog}
        className="topic-dialog sample-dialog"
        aria-labelledby="sample-heading"
        onClose={() => setOpen(false)}
      >
        <div className="flex items-start justify-between gap-3 no-print">
          <h2 id="sample-heading" className="text-xl font-semibold">
            Print sample questions
          </h2>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        {state.ready ? (
          <div className="sample-sheet mt-4">
            <p className="no-print hint text-sm" role="status">
              {state.note}
            </p>
            <button type="button" className="btn btn-primary no-print mt-3" onClick={() => window.print()}>
              Print
            </button>
            <header className="mt-4">
              <p className="eyebrow">
                {provinceName} · Grade {grade}
              </p>
              <h3 className="mt-1 text-lg font-semibold">Sample questions</h3>
            </header>
            <ol className="sample-list">
              {skills.map((skill) => (
                <li key={skill.id}>
                  <p className="font-semibold">{skill.title}</p>
                  <p>{skill.prompt}</p>
                  <p className="sample-answer">Answer: {skill.answer}</p>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <form action={action} className="mt-4 grid gap-3">
            <p className="hint text-sm">
              Enter your email to request the Grade {grade} sample sheet. Then the samples open for
              printing.
            </p>
            <input type="hidden" name="province" value={province} />
            <input type="hidden" name="grade" value={grade} />
            <label className="field">
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label className="check-row">
              <input type="checkbox" name="marketing" value="yes" />
              <span>Optional: email me occasional updates about Masterasium. You can unsubscribe at any time.</span>
            </label>
            <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
              {pending ? "Saving…" : "Show the samples"}
            </button>
            {state.error ? (
              <p className="feedback bad" role="alert">
                {state.error}
              </p>
            ) : null}
          </form>
        )}
      </dialog>
    </>
  );
}
