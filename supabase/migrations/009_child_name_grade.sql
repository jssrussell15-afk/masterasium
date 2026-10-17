-- A parent can add a child from signup with a first name and grade.
-- Grade and working grade are stored on the child, so the parent desk can change them later.
-- Signup also opens a practice session. Username and PIN stay empty until a student login is added.
-- Paste after the grade progress statements. Paste this again if an earlier copy is already in the database.

create or replace function public.create_child_profile(
  p_first_name text,
  p_grade integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_count integer;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  v_name := btrim(coalesce(p_first_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'Use a first name, up to 30 letters.';
  end if;

  if p_grade is null or p_grade < 1 or p_grade > 8 then
    raise exception 'Choose a grade from 1 to 8.';
  end if;

  select count(*) into v_count
  from public.children
  where parent_id = auth.uid();

  if v_count >= 2 then
    raise exception 'A parent account can have at most 2 child profiles';
  end if;

  insert into public.children (parent_id, first_name, grade, working_grade)
  values (auth.uid(), v_name, p_grade, p_grade)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_child_profile(text, integer) from public, anon, authenticated;
grant execute on function public.create_child_profile(text, integer) to authenticated;

-- Signup step 2. One save stores the child and opens practice, without a username or PIN.
create or replace function public.create_signup_child(
  p_first_name text,
  p_grade integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_id uuid;
  v_count integer;
  v_name text;
  v_token text;
begin
  if auth.uid() is null then
    raise exception 'Sign in as a parent first.';
  end if;

  v_name := btrim(coalesce(p_first_name, ''));
  if char_length(v_name) < 1 or char_length(v_name) > 30 then
    raise exception 'Use a first name, up to 30 letters.';
  end if;

  if p_grade is null or p_grade < 1 or p_grade > 8 then
    raise exception 'Choose a grade from 1 to 8.';
  end if;

  select count(*) into v_count
  from public.children
  where parent_id = auth.uid();

  if v_count >= 2 then
    raise exception 'A parent account can have at most 2 child profiles';
  end if;

  insert into public.children (parent_id, first_name, grade, working_grade)
  values (auth.uid(), v_name, p_grade, p_grade)
  returning id into v_id;

  v_token := encode(gen_random_bytes(32), 'hex');

  insert into public.student_sessions (child_id, token_hash, expires_at)
  values (
    v_id,
    encode(digest(v_token, 'sha256'), 'hex'),
    now() + interval '14 days'
  );

  return jsonb_build_object('child_id', v_id, 'token', v_token);
end;
$$;

revoke all on function public.create_signup_child(text, integer) from public, anon, authenticated;
grant execute on function public.create_signup_child(text, integer) to authenticated;
