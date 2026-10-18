# RLS test plan

Hosted migrations are not applied from this branch. Run these checks in a staging database after `20261018190052_create_sessions.sql` is applied there.

`create_sessions` follows the attempts pattern from `005_student_login.sql`.

## Parent, authenticated

- A parent can `select` `create_sessions` rows whose `child_id` belongs to `children.parent_id = auth.uid()`.
- That parent cannot `select` another parent's rows.
- Direct `insert`, `update`, and `delete` on `create_sessions` are not granted to `authenticated`.
- `set_create_settings` and `set_create_image_consent` succeed only when `children.parent_id = auth.uid()`.
- Both functions fail when `auth.uid()` is null.
- `create_daily_limit` outside 1–3 fails.

## Student, anon key plus `x-student-token`

- `current_student_id()` is the signed-in child.
- The student can `select`, `insert`, and `update` rows with that `child_id`.
- Insert or update with a different `child_id` fails.
- The student cannot read another child's rows.
- A row cannot contain a prompt, sentence, or image column. The table has none.

## Flags on `children`

- `authenticated` may select `create_enabled`, `create_write_own`, `create_daily_limit`, `create_image_consent_at`, and `create_image_consent_version` for their own children.
- `anon` may select `create_enabled`, `create_write_own`, and `create_daily_limit` on the signed-in child only, through the existing student select policy.
- Defaults: Create off, write-my-own off, daily limit 1, consent timestamp null.

## Create guardrail tables

`create_moderation_events` stores a category code and the prompt version. Parents can read events for their own children. Students do not get direct table writes. `reserve_create_generation` inserts the event inside the same transaction as the counters.

`create_daily_counters`, `create_parent_daily`, and `create_ip_daily` are written only by that function. `create_ip_daily` stores a hash, not a raw IP. Parents can read the child-day counter. They cannot read other accounts' IP hashes.

## Retention

Raw `create_sessions` rows stay for 12 months, then roll up to counts with no `child_id`. The migration records that policy and does not schedule the job. A later change should add the roll-up explicitly and prove the roll-up table has no `child_id` and no free text.
