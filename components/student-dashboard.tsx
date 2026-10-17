"use client";

import { useActionState } from "react";
import { DashboardWidget } from "@/components/dashboard-widget";
import { TopicPicker } from "@/components/topic-picker";
import { startSkill, type StartState } from "@/lib/practice/actions";
import type { GradeAccess } from "@/lib/practice/grade-access";
import type { StudentHome, HomeSkill } from "@/lib/practice/home";
import type { SkillProgress } from "@/lib/practice/types";
import type { SupportedGrade } from "@/lib/grades";

const initial: StartState = {};

export function StudentDashboard({
  childId,
  childName,
  grade,
  home,
  skills,
  access,
  requestedGrade,
}: {
  childId: string;
  childName: string;
  grade: SupportedGrade;
  home: StudentHome;
  skills: SkillProgress[];
  access: GradeAccess;
  requestedGrade: SupportedGrade | null;
}) {
  const [state, action, pending] = useActionState(startSkill, initial);

  return (
    <div className="mt-4 grid gap-4">
      <div>
        <h1 className="display text-4xl">{childName}</h1>
        <p className="hint mt-1">Grade {grade}</p>
      </div>
      {state.note ? (
        <p className="hint" role="status">
          {state.note}
        </p>
      ) : null}
      {state.error ? (
        <p className="feedback bad" role="alert">
          {state.error}
        </p>
      ) : null}
      <DashboardWidget title="Assigned" empty="Nothing else is waiting in this grade.">
        {home.assigned.length > 0 ? (
          <SkillChoices skills={home.assigned} childId={childId} action={action} pending={pending} />
        ) : null}
      </DashboardWidget>
      <DashboardWidget title="Recommended" empty="A recommendation will show up here.">
        {home.recommended.length > 0 ? (
          <SkillChoices skills={home.recommended} childId={childId} action={action} pending={pending} />
        ) : null}
      </DashboardWidget>
      <DashboardWidget title="Recently practiced" empty="No practice yet. Start with a recommended skill.">
        {home.recent.length > 0 ? (
          <SkillChoices skills={home.recent} childId={childId} action={action} pending={pending} />
        ) : null}
      </DashboardWidget>
      <TopicPicker
        action={action}
        pending={pending}
        childId={childId}
        skills={skills}
        access={access}
        requestedGrade={requestedGrade}
      />
    </div>
  );
}

function SkillChoices({
  skills,
  childId,
  action,
  pending,
}: {
  skills: HomeSkill[];
  childId: string;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  return (
    <ul className="skill-taps">
      {skills.map((skill) => (
        <li key={skill.id}>
          <form action={action}>
            <input type="hidden" name="childId" value={childId} />
            <input type="hidden" name="skillId" value={skill.id} />
            <button className="skill-tap" type="submit" disabled={pending}>
              <span>{skill.title}</span>
              <span className="hint">{skill.note}</span>
            </button>
          </form>
        </li>
      ))}
    </ul>
  );
}
