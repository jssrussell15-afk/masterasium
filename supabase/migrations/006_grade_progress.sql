-- Working grade, early unlock, and parent approval for a grade change.
-- Every grade stays visible. Mastery of the current grade is not required.
-- Run supabase/migrations/005_student_login.sql first, then paste these statements.

alter table public.children
  add column if not exists working_grade smallint,
  add column if not exists next_grade_unlocked boolean not null default false,
  add column if not exists requested_grade smallint;

alter table public.children drop constraint if exists children_working_grade_check;
alter table public.children
  add constraint children_working_grade_check
  check (working_grade is null or working_grade between 1 and 8);

alter table public.children drop constraint if exists children_requested_grade_check;
alter table public.children
  add constraint children_requested_grade_check
  check (requested_grade is null or requested_grade between 1 and 8);

update public.children
set working_grade = grade
where working_grade is null;

alter table public.children
  alter column working_grade set not null;

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

  insert into public.children (
    parent_id, first_name, grade, username, pin_hash, working_grade
  )
  values (
    auth.uid(),
    btrim(p_first_name),
    p_grade,
    v_username,
    crypt(p_pin, gen_salt('bf', 10)),
    p_grade
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.adopt_working_grade(p_grade integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.current_student_id();
  v_enrolled smallint;
  v_working smallint;
  v_unlocked boolean;
begin
  if v_id is null then
    raise exception 'Sign in as a student first.';
  end if;
  if p_grade is null or p_grade < 1 or p_grade > 8 then
    raise exception 'Choose a grade from 1 to 8.';
  end if;

  select grade, working_grade, next_grade_unlocked
    into v_enrolled, v_working, v_unlocked
  from public.children
  where id = v_id;

  if not found then
    raise exception 'That student session ended.';
  end if;

  if p_grade <> v_enrolled
     and p_grade <> v_working
     and not (v_unlocked and p_grade = v_enrolled + 1) then
    raise exception 'Ask a parent to approve that grade.';
  end if;

  update public.children
  set working_grade = p_grade,
      requested_grade = case when requested_grade = p_grade then null else requested_grade end
  where id = v_id;
end;
$$;

create or replace function public.request_working_grade(p_grade integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := public.current_student_id();
  v_enrolled smallint;
  v_working smallint;
  v_unlocked boolean;
begin
  if v_id is null then
    raise exception 'Sign in as a student first.';
  end if;
  if p_grade is null or p_grade < 1 or p_grade > 8 then
    raise exception 'Choose a grade from 1 to 8.';
  end if;

  select grade, working_grade, next_grade_unlocked
    into v_enrolled, v_working, v_unlocked
  from public.children
  where id = v_id;

  if not found then
    raise exception 'That student session ended.';
  end if;

  if p_grade = v_enrolled
     or p_grade = v_working
     or (v_unlocked and p_grade = v_enrolled + 1) then
    update public.children
    set working_grade = p_grade,
        requested_grade = case when requested_grade = p_grade then null else requested_grade end
    where id = v_id;
    return;
  end if;

  update public.children
  set requested_grade = p_grade
  where id = v_id;
end;
$$;

create or replace function public.set_next_grade_unlock(
  p_child_id uuid,
  p_unlocked boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grade smallint;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  select grade into v_grade
  from public.children
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;

  if v_grade >= 8 then
    raise exception 'Grade 8 is the last grade.';
  end if;

  update public.children
  set next_grade_unlocked = coalesce(p_unlocked, false)
  where id = p_child_id
    and parent_id = auth.uid();
end;
$$;

create or replace function public.decide_grade_request(
  p_child_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested smallint;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  select requested_grade into v_requested
  from public.children
  where id = p_child_id
    and parent_id = auth.uid();

  if not found then
    raise exception 'That child profile is not on this account.';
  end if;

  if v_requested is null then
    raise exception 'There is no grade request to review.';
  end if;

  if coalesce(p_approve, false) then
    update public.children
    set working_grade = v_requested,
        requested_grade = null
    where id = p_child_id
      and parent_id = auth.uid();
  else
    update public.children
    set requested_grade = null
    where id = p_child_id
      and parent_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.create_child_profile(text, integer, text, text) from public, anon, authenticated;
revoke all on function public.adopt_working_grade(integer) from public, anon, authenticated;
revoke all on function public.request_working_grade(integer) from public, anon, authenticated;
revoke all on function public.set_next_grade_unlock(uuid, boolean) from public, anon, authenticated;
revoke all on function public.decide_grade_request(uuid, boolean) from public, anon, authenticated;

grant execute on function public.create_child_profile(text, integer, text, text) to authenticated;
grant execute on function public.adopt_working_grade(integer) to anon, authenticated;
grant execute on function public.request_working_grade(integer) to anon, authenticated;
grant execute on function public.set_next_grade_unlock(uuid, boolean) to authenticated;
grant execute on function public.decide_grade_request(uuid, boolean) to authenticated;

grant select (working_grade, next_grade_unlocked, requested_grade)
  on public.children to anon, authenticated;
