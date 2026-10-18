-- Pre-launch row scope and sign-in limits.
-- Do not apply this file to hosted Supabase from the app. Matthew runs it by hand.
--
-- Kid and parent tables that exist: profiles, children, skill_states (mastery,
-- including consecutive_correct), attempts, pending_questions, digest_stubs,
-- student_sessions, student_login_attempts, practice_events, lesson_runs,
-- skill_reviews, talk_samples, worksheet_templates, worksheets, sample_requests,
-- notify_emails.
-- There is no streaks table and no content_flags table. Can-do lists are read
-- from lesson_runs, skill_reviews, and skill_states.

create schema if not exists extensions;

alter table public.student_login_attempts
  add column if not exists device_key text;

alter table public.student_login_attempts
  drop constraint if exists student_login_attempts_device_key_check;

alter table public.student_login_attempts
  add constraint student_login_attempts_device_key_check
  check (device_key is null or device_key ~ '^[A-Za-z0-9_-]{8,80}$');

create index if not exists student_login_attempts_device_idx
  on public.student_login_attempts (device_key, attempted_at desc)
  where device_key is not null;

create table if not exists public.practice_set_attempts (
  id bigint generated always as identity primary key,
  access_code text not null,
  device_key text,
  attempted_at timestamptz not null default now(),
  constraint practice_set_attempts_code_len check (char_length(access_code) <= 12),
  constraint practice_set_attempts_device_key_check
    check (device_key is null or device_key ~ '^[A-Za-z0-9_-]{8,80}$')
);

create index if not exists practice_set_attempts_code_idx
  on public.practice_set_attempts (access_code, attempted_at desc);

create index if not exists practice_set_attempts_device_idx
  on public.practice_set_attempts (device_key, attempted_at desc)
  where device_key is not null;

alter table public.practice_set_attempts enable row level security;
revoke all on public.practice_set_attempts from public, anon, authenticated;

-- Fixed search_path on every security-definer function. pgcrypto stays on the path.
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.enforce_two_children() set search_path = pg_catalog, public;
alter function public.request_student_token() set search_path = pg_catalog, public;
alter function public.current_student_id() set search_path = pg_catalog, public, extensions;
alter function public.create_child_profile(text, integer) set search_path = pg_catalog, public;
alter function public.create_child_profile(text, integer, text, text) set search_path = pg_catalog, public, extensions;
alter function public.create_signup_child(text, integer) set search_path = pg_catalog, public, extensions;
alter function public.set_student_login(uuid, text, text) set search_path = pg_catalog, public, extensions;
alter function public.reset_student_pin(uuid, text) set search_path = pg_catalog, public, extensions;
alter function public.end_student_session() set search_path = pg_catalog, public, extensions;
alter function public.adopt_working_grade(integer) set search_path = pg_catalog, public;
alter function public.request_working_grade(integer) set search_path = pg_catalog, public;
alter function public.set_next_grade_unlock(uuid, boolean) set search_path = pg_catalog, public;
alter function public.decide_grade_request(uuid, boolean) set search_path = pg_catalog, public;
alter function public.student_name_key(text) set search_path = pg_catalog, public;
alter function public.current_doc(text, integer, date) set search_path = pg_catalog, public;

-- Trigger helper. Callers do not need to execute it.
revoke all on function public.enforce_two_children() from public, anon, authenticated;

create or replace function public.request_device_key()
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_headers json;
  v_key text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception
    when others then
      return null;
  end;
  if v_headers is null then
    return null;
  end if;
  v_key := nullif(v_headers->>'x-device-key', '');
  if v_key is null or v_key !~ '^[A-Za-z0-9_-]{8,80}$' then
    return null;
  end if;
  return v_key;
end;
$$;

create or replace function public.login_is_locked(p_subject text, p_device text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    (
      select count(*)
      from public.student_login_attempts
      where attempted_at > now() - interval '15 minutes'
        and username = p_subject
    ) >= 5
    or (
      p_device is not null
      and (
        select count(*)
        from public.student_login_attempts
        where attempted_at > now() - interval '15 minutes'
          and device_key = p_device
      ) >= 5
    );
$$;

create or replace function public.parent_owns_login_subject(p_subject text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.children
    where children.parent_id = (select auth.uid())
      and (
        children.username = p_subject
        or public.student_name_key(children.first_name) = p_subject
      )
  );
$$;

-- Five failures in 15 minutes locks that child name and, when sent, the device.
create or replace function public.start_student_session(
  p_username text,
  p_pin text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_username text;
  v_child_id uuid;
  v_pin_hash text;
  v_dummy text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  v_token text;
  v_device text := public.request_device_key();
begin
  v_username := lower(btrim(coalesce(p_username, '')));
  if v_username !~ '^[a-z0-9]{3,20}$' or coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    return null;
  end if;

  delete from public.student_login_attempts
  where attempted_at < now() - interval '1 day';

  if public.login_is_locked(v_username, v_device) then
    return 'locked';
  end if;

  insert into public.student_login_attempts (username, device_key)
  values (v_username, v_device);

  select id, pin_hash into v_child_id, v_pin_hash
  from public.children
  where username = v_username;

  if v_pin_hash is null or crypt(p_pin, coalesce(v_pin_hash, v_dummy)) <> v_pin_hash then
    return null;
  end if;

  delete from public.student_login_attempts
  where username = v_username
     or (v_device is not null and device_key = v_device);

  delete from public.student_sessions
  where child_id = v_child_id
    and expires_at <= now();

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.student_sessions (child_id, token_hash, expires_at)
  values (
    v_child_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    now() + interval '14 days'
  );

  return v_token;
end;
$$;

create or replace function public.start_student_session_by_name(
  p_first_name text,
  p_pin text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_key text;
  v_child_id uuid;
  v_matches integer := 0;
  v_token text;
  v_row record;
  v_dummy text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  v_device text := public.request_device_key();
begin
  v_key := public.student_name_key(p_first_name);
  if v_key = '' or char_length(v_key) > 40 or coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    return null;
  end if;

  delete from public.student_login_attempts
  where attempted_at < now() - interval '1 day';

  if public.login_is_locked(v_key, v_device) then
    return 'locked';
  end if;

  insert into public.student_login_attempts (username, device_key)
  values (v_key, v_device);

  for v_row in
    select id, pin_hash
    from public.children
    where public.student_name_key(first_name) = v_key
      and pin_hash is not null
  loop
    if crypt(p_pin, coalesce(v_row.pin_hash, v_dummy)) = v_row.pin_hash then
      v_matches := v_matches + 1;
      v_child_id := v_row.id;
    end if;
  end loop;

  if v_matches <> 1 then
    return null;
  end if;

  delete from public.student_login_attempts
  where username = v_key
     or (v_device is not null and device_key = v_device);

  delete from public.student_sessions
  where child_id = v_child_id
    and expires_at <= now();

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.student_sessions (child_id, token_hash, expires_at)
  values (
    v_child_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    now() + interval '14 days'
  );

  return v_token;
end;
$$;

create or replace function public.open_practice_set(access_code text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result jsonb;
  v_code text := upper(btrim(coalesce(access_code, '')));
  v_device text := public.request_device_key();
  v_recent integer;
begin
  if v_code = '' or char_length(v_code) > 12 then
    return null;
  end if;

  delete from public.practice_set_attempts
  where attempted_at < now() - interval '1 day';

  select count(*) into v_recent
  from public.practice_set_attempts as attempts
  where attempts.attempted_at > now() - interval '15 minutes'
    and (
      attempts.access_code = v_code
      or (v_device is not null and attempts.device_key = v_device)
    );

  if v_recent >= 5 then
    return null;
  end if;

  select jsonb_build_object(
    'code', worksheets.access_code,
    'title', worksheets.title,
    'instructions', worksheets.instructions,
    'subtitle', worksheets.subtitle,
    'logoData', worksheets.logo_data,
    'items', worksheets.items
  )
  into result
  from public.worksheets
  where worksheets.access_code = v_code;

  if result is null then
    insert into public.practice_set_attempts (access_code, device_key)
    values (v_code, v_device);
  end if;

  return result;
end;
$$;

revoke all on function public.request_device_key() from public, anon, authenticated;
revoke all on function public.login_is_locked(text, text) from public, anon, authenticated;
revoke all on function public.parent_owns_login_subject(text) from public, anon, authenticated;
revoke all on function public.request_student_token() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.student_name_key(text) from public, anon, authenticated;
revoke all on function public.start_student_session(text, text) from public, anon, authenticated;
revoke all on function public.start_student_session_by_name(text, text) from public, anon, authenticated;
revoke all on function public.open_practice_set(text) from public, anon, authenticated;
revoke all on function public.current_student_id() from public, anon, authenticated;
revoke all on function public.end_student_session() from public, anon, authenticated;
revoke all on function public.adopt_working_grade(integer) from public, anon, authenticated;
revoke all on function public.request_working_grade(integer) from public, anon, authenticated;
revoke all on function public.create_child_profile(text, integer) from public, anon, authenticated;
revoke all on function public.create_child_profile(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.create_signup_child(text, integer) from public, anon, authenticated;
revoke all on function public.set_student_login(uuid, text, text) from public, anon, authenticated;
revoke all on function public.reset_student_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.set_next_grade_unlock(uuid, boolean) from public, anon, authenticated;
revoke all on function public.decide_grade_request(uuid, boolean) from public, anon, authenticated;

-- Anon needs the seven student and worksheet entry points. Nothing else.
grant execute on function public.current_student_id() to anon, authenticated;
grant execute on function public.start_student_session(text, text) to anon, authenticated;
grant execute on function public.start_student_session_by_name(text, text) to anon, authenticated;
grant execute on function public.end_student_session() to anon, authenticated;
grant execute on function public.adopt_working_grade(integer) to anon, authenticated;
grant execute on function public.request_working_grade(integer) to anon, authenticated;
grant execute on function public.open_practice_set(text) to anon, authenticated;

-- Parent account changes stay on the signed-in parent role.
grant execute on function public.create_child_profile(text, integer) to authenticated;
grant execute on function public.create_child_profile(text, integer, text, text) to authenticated;
grant execute on function public.create_signup_child(text, integer) to authenticated;
grant execute on function public.set_student_login(uuid, text, text) to authenticated;
grant execute on function public.reset_student_pin(uuid, text) to authenticated;
grant execute on function public.set_next_grade_unlock(uuid, boolean) to authenticated;
grant execute on function public.decide_grade_request(uuid, boolean) to authenticated;
grant execute on function public.parent_owns_login_subject(text) to authenticated;

-- The two tables that had RLS and no policies.
drop policy if exists "parents read their children's sessions" on public.student_sessions;
create policy "parents read their children's sessions"
  on public.student_sessions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.children
      where children.id = student_sessions.child_id
        and children.parent_id = (select auth.uid())
    )
  );

drop policy if exists "students read their own sessions" on public.student_sessions;
create policy "students read their own sessions"
  on public.student_sessions
  for select
  to anon
  using (child_id = (select public.current_student_id()));

revoke all on public.student_sessions from public, anon, authenticated;
grant select (id, child_id, expires_at, created_at) on public.student_sessions to authenticated;

drop policy if exists "parents read their children's login attempts" on public.student_login_attempts;
create policy "parents read their children's login attempts"
  on public.student_login_attempts
  for select
  to authenticated
  using ((select public.parent_owns_login_subject(username)));

revoke all on public.student_login_attempts from public, anon, authenticated;
grant select (id, username, attempted_at) on public.student_login_attempts to authenticated;

-- A digest row cannot point at another parent's child.
drop policy if exists "parents own digest drafts" on public.digest_stubs;
create policy "parents own digest drafts"
  on public.digest_stubs
  for all
  to authenticated
  using (
    parent_id = (select auth.uid())
    and (
      child_id is null
      or exists (
        select 1
        from public.children
        where children.id = digest_stubs.child_id
          and children.parent_id = (select auth.uid())
      )
    )
  )
  with check (
    parent_id = (select auth.uid())
    and (
      child_id is null
      or exists (
        select 1
        from public.children
        where children.id = digest_stubs.child_id
          and children.parent_id = (select auth.uid())
      )
    )
  );
