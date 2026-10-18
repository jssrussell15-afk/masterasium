# RLS manual test plan

Run this against a **local or throwaway** Supabase project after the new migrations are applied. Do not run it against the live family data in `znfpqvlehigjtbwfeiny` until you have a second parent you can delete.

Automated coverage, when Postgres is available:

```bash
bash scripts/rls-isolation.sh
```

That script creates database `masterasium_rls_test`, applies `supabase/tests/auth_stub.sql` and every migration, then runs `supabase/tests/rls_isolation.sql`. It does not use hosted credentials.

## What exists

Kid and parent tables: `profiles`, `children`, `skill_states` (mastery; the old `streak` column is now `consecutive_correct`), `attempts`, `pending_questions`, `digest_stubs`, `student_sessions`, `student_login_attempts`, `practice_events`, `lesson_runs`, `skill_reviews`, `talk_samples`, `worksheet_templates`, `worksheets`, `sample_requests`, `notify_emails`.

`student_sessions` and `student_login_attempts` had RLS and no policies. They now have parent-scoped select policies. Token hashes stay off the parent role. Students reach their own rows only through `current_student_id()`, which reads `x-student-token`.

There is **no** `streaks` table and **no** `content_flags` table. Can-do rows are `lesson_runs`, `skill_reviews`, and `skill_states`.

Curriculum tables (`jurisdiction`, `curriculum_doc`, `skill`, and the rest) are public reads. They are not family data.

## Throwaway parent B

1. Apply `supabase/migrations/20261018153000_rename_skill_state_streak.sql`, `20261018160000_rls_and_rate_limits.sql`, and `20261018161000_stripe_and_xai_usage.sql` in the Supabase SQL editor. Do not re-paste older setup SQL after that.
2. In Authentication → Providers → Email, turn on **leaked password protection** (HaveIBeenPwned).
3. Create parent A and parent B with two different emails. Add one child to each. Set a PIN on parent A's child.
4. Sign in as parent A in one browser profile. Copy the child id, one attempt id, one `skill_states` key, one `student_sessions` id, and one practice-event id from the SQL editor using the service role (table editor), not from the app.
5. Sign in as parent B. In the browser console, with the anon key only:

```js
const id = "<parent A child uuid>";
const { data, error } = await supabase.from("children").select("id, first_name").eq("id", id);
```

`data` must be `[]`. Repeat for `attempts`, `skill_states`, `practice_events`, `lesson_runs`, `skill_reviews`, `talk_samples`, `student_sessions`, `worksheets`, and `digest_stubs`, each filtered by parent A's id. Parent B must not see a row.

6. Still as parent B, try to write:

```js
await supabase.from("attempts").insert({
  child_id: id,
  skill_id: "g3-place",
  prompt: "nope",
  expected: "1",
  given: "1",
  correct: false,
});
await supabase.rpc("set_student_login", { p_child_id: id, p_username: "taken1", p_pin: "9999" });
await supabase.rpc("reset_student_pin", { p_child_id: id, p_pin: "9999" });
```

Each call must error or change zero rows. Parent A's PIN still works.

7. Sign in as parent A's child with the PIN. From that browser, query parent B's child id. The result must be empty. Post an attempt whose `child_id` is parent B's child. It must fail.

8. Call `start_student_session_by_name` six times with the right name and a wrong PIN. The sixth response is the string `locked`. A correct PIN stays locked for 15 minutes. Repeat with `open_practice_set` and a bad code five times from the same browser; a real code from that browser then returns null until the 15 minutes pass. A different browser can still open the real code.

9. Delete parent B (and parent A if they were throwaway) from Authentication → Users when you are done.
