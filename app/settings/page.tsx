import { Suspense } from "react";
import { ChildNameSetupSql } from "@/components/child-name-setup-sql";
import { EventSetupSql } from "@/components/event-setup-sql";
import { GradeSettings } from "@/components/grade-settings";
import { GradeSetupSql } from "@/components/grade-setup-sql";
import { SetPinForm } from "@/components/student-access-forms";
import { SignOutButton } from "@/components/sign-out-button";
import { Shell } from "@/components/site-header";
import { StudentSetupSql } from "@/components/student-setup-sql";
import { ensureProfile, requireUser } from "@/lib/auth/session";
import { loadRoster } from "@/lib/children/roster";
import { friendlyDbError } from "@/lib/db-error";

export default function SettingsPage(props: PageProps<"/settings">) {
  return (
    <Shell role="parent" action={<SignOutButton />}>
      <Suspense fallback={<p className="status mt-10">Loading account settings…</p>}>
        <Settings searchParams={props.searchParams} />
      </Suspense>
    </Shell>
  );
}

async function Settings({
  searchParams,
}: {
  searchParams: PageProps<"/settings">["searchParams"];
}) {
  const params = await searchParams;
  const notice = Array.isArray(params.notice) ? params.notice[0] : params.notice;
  const { supabase, user } = await requireUser();
  const profileError = await ensureProfile(supabase, user.id);
  if (profileError) {
    return <p className="feedback bad mt-8">{friendlyDbError(profileError)}</p>;
  }

  const roster = await loadRoster(supabase, user.id);
  if (roster.error) {
    return <p className="feedback bad mt-8">{roster.error}</p>;
  }
  const children = roster.children;

  return (
    <div className="mt-6 grid max-w-xl gap-6">
      <div>
        <p className="eyebrow">Parent account</p>
        <h1 className="display mt-2 text-4xl">Account settings</h1>
        <p className="hint mt-2">
          Enrollment and any billing stay on this login. A student login cannot open this page.
        </p>
      </div>

      {notice === "pin" ? (
        <p className="feedback good" role="status">
          PIN saved. They sign in with their first name and this PIN. An older PIN no longer works.
        </p>
      ) : null}
      {notice === "login" ? (
        <p className="feedback good" role="status">
          Student login saved. They sign in with their first name and PIN.
        </p>
      ) : null}
      {notice === "grade" ? (
        <p className="feedback good" role="status">
          Grade unlock updated.
        </p>
      ) : null}
      {notice === "grade-approved" ? (
        <p className="feedback good" role="status">
          Grade request approved. Practice and review now follow that grade.
        </p>
      ) : null}
      {notice === "grade-declined" ? (
        <p className="feedback good" role="status">
          Grade request cleared. Practice stays in the current grade.
        </p>
      ) : null}

      <section className="card grid gap-2">
        <h2 className="text-lg font-semibold">Email</h2>
        <p>{user.email}</p>
        <p className="hint text-sm">This is the parent sign-in. Students do not use email.</p>
      </section>

      {roster.studentSetup ? (
        <div className="grid gap-3">
          <p className="feedback bad" role="alert">
            {roster.studentSetup}
          </p>
          <StudentSetupSql open />
        </div>
      ) : null}
      {roster.gradeSetup ? (
        <div className="grid gap-3">
          <p className="feedback bad" role="alert">
            {roster.gradeSetup}
          </p>
          <GradeSetupSql open />
        </div>
      ) : null}

      {children.map((child) => (
        <section key={child.id} className="card grid gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{child.first_name}</h2>
            <p className="hint mt-1">
              Enrolled in Grade {child.grade}
              {child.workingGrade === child.grade ? "" : ` · Working in Grade ${child.workingGrade}`}
            </p>
          </div>
          {roster.gradeSetup ? null : (
            <GradeSettings
              childId={child.id}
              firstName={child.first_name}
              enrolled={child.grade}
              workingGrade={child.workingGrade}
              nextUnlocked={child.nextUnlocked}
              requestedGrade={child.requestedGrade}
            />
          )}
          <SetPinForm
            childId={child.id}
            firstName={child.first_name}
            hasLogin={Boolean(child.username)}
            returnTo="settings"
          />
        </section>
      ))}

      {children.length === 0 ? (
        <p className="hint">Add a child from the parent desk. Then their login shows up here.</p>
      ) : null}

      {roster.studentSetup ? null : <StudentSetupSql />}
      {roster.gradeSetup ? null : <GradeSetupSql />}
      <EventSetupSql />
      <ChildNameSetupSql />
    </div>
  );
}
