-- Student login: username and PIN on the child profile. No child email, no auth.users row.
-- Parents keep billing, enrollment, and the desk. They can read scores, not question text.
-- Paste these statements into the Supabase SQL editor. There is no payment table.

create extension if not exists pgcrypto;

alter table public.children
  add column if not exists username text,
  add column if not exists pin_hash text;

alter table public.children drop constraint if exists children_username_format;
alter table public.children
  add constraint children_username_format
  check (username is null or username ~ '^[a-z0-9]{3,20}$');

create unique index if not exists children_username_key
  on public.children (username)
  where username is not null;

create table if not exists public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists student_sessions_child_idx
  on public.student_sessions (child_id);

create table if not exists public.student_login_attempts (
  id bigint generated always as identity primary key,
  username text not null,
  attempted_at timestamptz not null default now()
);

create index if not exists student_login_attempts_username_idx
  on public.student_login_attempts (username, attempted_at desc);

alter table public.student_sessions enable row level security;
alter table public.student_login_attempts enable row level security;

revoke all on public.student_sessions from public, anon, authenticated;
revoke all on public.student_login_attempts from public, anon, authenticated;

-- The raw token arrives as x-student-token. Only its hash is stored.
create or replace function public.request_student_token()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_headers json;
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
  return nullif(v_headers->>'x-student-token', '');
end;
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select sessions.child_id
  from public.student_sessions as sessions
  where public.request_student_token() is not null
    and sessions.token_hash = encode(digest(public.request_student_token(), 'sha256'), 'hex')
    and sessions.expires_at > now()
  limit 1;
$$;

create or replace function public.create_child_profile(
  p_first_name text,
  p_grade integer,
  p_username text,
  p_pin text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
  v_id uuid;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  if p_first_name is null
    or char_length(btrim(p_first_name)) < 1
    or char_length(btrim(p_first_name)) > 40 then
    raise exception 'Use a first name, up to 40 letters.';
  end if;

  if p_grade is null or p_grade < 1 or p_grade > 8 then
    raise exception 'Choose a grade from 1 to 8.';
  end if;

  v_username := lower(btrim(coalesce(p_username, '')));
  if v_username !~ '^[a-z0-9]{3,20}$' then
    raise exception 'Use 3 to 20 letters or numbers, with no spaces.';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'Use a PIN of 4 to 6 digits.';
  end if;

  select count(*) into v_count
  from public.children
  where parent_id = auth.uid();

  if v_count >= 2 then
    raise exception 'A parent account can have at most 2 child profiles';
  end if;

  insert into public.children (parent_id, first_name, grade, username, pin_hash)
  values (
    auth.uid(),
    btrim(p_first_name),
    p_grade,
    v_username,
    crypt(p_pin, gen_salt('bf', 10))
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.set_student_login(
  p_child_id uuid,
  p_username text,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
  v_existing text;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  v_username := lower(btrim(coalesce(p_username, '')));
  if v_username !~ '^[a-z0-9]{3,20}$' then
    raise exception 'Use 3 to 20 letters or numbers, with no spaces.';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'Use a PIN of 4 to 6 digits.';
  end if;

  select username into v_existing
  from public.children
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;

  if v_existing is not null then
    raise exception 'This student already has a username. Reset the PIN instead.';
  end if;

  update public.children
  set username = v_username,
      pin_hash = crypt(p_pin, gen_salt('bf', 10))
  where id = p_child_id
    and parent_id = auth.uid();
end;
$$;

create or replace function public.reset_student_pin(
  p_child_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  if coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    raise exception 'Use a PIN of 4 to 6 digits.';
  end if;

  select username into v_username
  from public.children
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;

  if v_username is null then
    raise exception 'Create the student login before resetting the PIN.';
  end if;

  update public.children
  set pin_hash = crypt(p_pin, gen_salt('bf', 10))
  where id = p_child_id
    and parent_id = auth.uid();

  delete from public.student_sessions
  where child_id = p_child_id;
end;
$$;

-- Wrong username and wrong PIN return null. The failure is committed so the limit holds.
create or replace function public.start_student_session(
  p_username text,
  p_pin text
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text;
  v_child_id uuid;
  v_pin_hash text;
  v_dummy text := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  v_recent integer;
  v_token text;
begin
  v_username := lower(btrim(coalesce(p_username, '')));
  if v_username !~ '^[a-z0-9]{3,20}$' or coalesce(p_pin, '') !~ '^[0-9]{4,6}$' then
    return null;
  end if;

  delete from public.student_login_attempts
  where attempted_at < now() - interval '1 day';

  select count(*) into v_recent
  from public.student_login_attempts
  where username = v_username
    and attempted_at > now() - interval '15 minutes';

  if v_recent >= 8 then
    return 'locked';
  end if;

  insert into public.student_login_attempts (username)
  values (v_username);

  select id, pin_hash into v_child_id, v_pin_hash
  from public.children
  where username = v_username;

  if v_pin_hash is null or crypt(p_pin, coalesce(v_pin_hash, v_dummy)) <> v_pin_hash then
    return null;
  end if;

  delete from public.student_login_attempts
  where username = v_username;

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

create or replace function public.end_student_session()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  v_token := public.request_student_token();
  if v_token is null then
    return;
  end if;

  delete from public.student_sessions
  where token_hash = encode(digest(v_token, 'sha256'), 'hex');
end;
$$;

revoke all on function public.request_student_token() from public, anon, authenticated;
revoke all on function public.current_student_id() from public, anon, authenticated;
revoke all on function public.create_child_profile(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.set_student_login(uuid, text, text) from public, anon, authenticated;
revoke all on function public.reset_student_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.start_student_session(text, text) from public, anon, authenticated;
revoke all on function public.end_student_session() from public, anon, authenticated;

grant execute on function public.current_student_id() to anon, authenticated;
grant execute on function public.create_child_profile(text, integer, text, text) to authenticated;
grant execute on function public.set_student_login(uuid, text, text) to authenticated;
grant execute on function public.reset_student_pin(uuid, text) to authenticated;
grant execute on function public.start_student_session(text, text) to anon, authenticated;
grant execute on function public.end_student_session() to anon, authenticated;

-- Parents read profiles and scores. Question text and the PIN hash stay off the parent role.
revoke all on public.children from anon, authenticated;
grant select (id, parent_id, first_name, grade, username, created_at)
  on public.children to authenticated;
grant select (id, first_name, grade)
  on public.children to anon;

revoke insert, update, delete on public.skill_states from authenticated;
revoke all on public.skill_states from anon;
grant select, insert, update, delete on public.skill_states to anon;

revoke all on public.attempts from anon, authenticated;
grant select (id, child_id, skill_id, correct, created_at)
  on public.attempts to authenticated;
grant select, insert on public.attempts to anon;

revoke all on public.pending_questions from anon, authenticated;
grant select, insert, update, delete on public.pending_questions to anon;

drop policy if exists "parents own their children" on public.children;
drop policy if exists "parents read their children" on public.children;
create policy "parents read their children"
  on public.children for select
  to authenticated
  using (parent_id = auth.uid());

drop policy if exists "parents own skill states" on public.skill_states;
drop policy if exists "parents read skill states" on public.skill_states;
create policy "parents read skill states"
  on public.skill_states for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = skill_states.child_id
        and children.parent_id = auth.uid()
    )
  );

drop policy if exists "parents own attempts" on public.attempts;
drop policy if exists "parents read attempt scores" on public.attempts;
create policy "parents read attempt scores"
  on public.attempts for select
  to authenticated
  using (
    exists (
      select 1 from public.children
      where children.id = attempts.child_id
        and children.parent_id = auth.uid()
    )
  );

drop policy if exists "parents own pending questions" on public.pending_questions;

drop policy if exists "students read their own profile" on public.children;
create policy "students read their own profile"
  on public.children for select
  to anon
  using (id = public.current_student_id());

drop policy if exists "students own skill states" on public.skill_states;
create policy "students own skill states"
  on public.skill_states for all
  to anon
  using (child_id = public.current_student_id())
  with check (child_id = public.current_student_id());

drop policy if exists "students read their attempts" on public.attempts;
create policy "students read their attempts"
  on public.attempts for select
  to anon
  using (child_id = public.current_student_id());

drop policy if exists "students insert their attempts" on public.attempts;
create policy "students insert their attempts"
  on public.attempts for insert
  to anon
  with check (child_id = public.current_student_id());

drop policy if exists "students own pending questions" on public.pending_questions;
create policy "students own pending questions"
  on public.pending_questions for all
  to anon
  using (child_id = public.current_student_id())
  with check (child_id = public.current_student_id());
