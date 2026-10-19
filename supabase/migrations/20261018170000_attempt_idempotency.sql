-- One client attempt id records a first try once.
-- A retry that reaches the server again does not add a second attempt.
-- This does not touch skill_states. The consecutive_correct rename is already applied live.
-- attempts on the live database has no client_attempt_id yet, so these adds are still required.
-- Students may mark only learning_applied. They cannot update prompt, given, or any other column.
-- IF NOT EXISTS and drop policy if exists keep a replay harmless. Do not apply this file from the app.

alter table public.attempts
  add column if not exists client_attempt_id uuid;

alter table public.attempts
  add column if not exists learning_applied boolean not null default false;

create unique index if not exists attempts_client_attempt_idx
  on public.attempts (child_id, client_attempt_id)
  where client_attempt_id is not null;

grant update (learning_applied) on public.attempts to anon;

drop policy if exists "students mark learning applied" on public.attempts;
create policy "students mark learning applied"
  on public.attempts
  for update
  to anon
  using (child_id = public.current_student_id())
  with check (child_id = public.current_student_id());
