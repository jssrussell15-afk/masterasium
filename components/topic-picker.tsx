"use client";

import { useEffect, useRef, useState } from "react";
import { MasteryMark } from "@/components/mastery-mark";
import type { SupportedGrade } from "@/lib/grades";
import { gradeIsOpen, nextEnrolledGrade, selectorGrades } from "@/lib/practice/grade-access";
import { masteryLabel, masteryMark } from "@/lib/practice/mastery";
import type { GradeAccess } from "@/lib/practice/grade-access";
import type { SkillProgress } from "@/lib/practice/types";

export function TopicPicker({
  action,
  pending,
  childId,
  skills,
  access,
  requestedGrade,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
  childId: string;
  skills: SkillProgress[];
  access: GradeAccess;
  requestedGrade: SupportedGrade | null;
}) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open) {
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary home-link w-fit"
        aria-haspopup="dialog"
        disabled={pending}
        onClick={() => setOpen(true)}
      >
        All skills
      </button>
      <dialog
        ref={dialog}
        className="topic-dialog"
        aria-labelledby="topic-heading"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          if (!inside) setOpen(false);
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="topic-heading" className="text-xl font-semibold">
            Choose a topic
          </h2>
          <button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <div className="topic-grades">
          {selectorGrades().map((grade) => {
            const group = skills.filter((skill) => skill.grade === grade);
            return (
              <section key={grade} className="topic-grade" aria-label={`Grade ${grade}`}>
                <h3>Grade {grade}</h3>
                <p className="hint">{gradeNote(grade, access, requestedGrade)}</p>
                <ul className="topic-choices">
                  {group.map((skill) => (
                    <li key={skill.id}>
                      <form action={action}>
                        <input type="hidden" name="childId" value={childId} />
                        <input type="hidden" name="skillId" value={skill.id} />
                        <button className="topic-choice" type="submit" disabled={pending}>
                          <span className="topic-name">
                            <MasteryMark status={skill.status} />
                            {skill.title}
                          </span>
                          <span>{masteryLabel(masteryMark(skill.status))}</span>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </dialog>
    </>
  );
}

function gradeNote(
  grade: SupportedGrade,
  access: GradeAccess,
  requestedGrade: SupportedGrade | null,
): string {
  if (grade === access.working) return "Working in this grade. Questions and review stay here.";
  if (requestedGrade === grade) return "Waiting for a parent to approve this grade.";
  if (grade === access.enrolled) return "Enrolled grade. Choosing a topic moves practice back here.";
  const next = nextEnrolledGrade(access.enrolled);
  if (access.nextUnlocked && next === grade) {
    return "Unlocked early. Choosing a topic moves practice here.";
  }
  if (gradeIsOpen(access, grade)) return "Choosing a topic moves practice here.";
  return "Visible without finishing the earlier grade. Choosing a topic asks a parent to approve it.";
}
