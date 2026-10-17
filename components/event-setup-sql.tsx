import { PRACTICE_EVENTS_SETUP_SQL } from "@/lib/practice/event-setup-sql";

export function EventSetupSql() {
  return (
    <details className="setup-sql">
      <summary>Practice event statements</summary>
      <p className="hint mt-2">
        Paste these after the grade progress statements. Practice still works before they are added.
        The rows record intro views, hints, attempts, and time on task. They do not store question text.
      </p>
      <pre>{PRACTICE_EVENTS_SETUP_SQL}</pre>
    </details>
  );
}
