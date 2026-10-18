-- Isolation checks for two parent accounts. Not a migration.
-- Run after supabase/tests/auth_stub.sql and every migration, on a local database only.

create schema if not exists extensions;

create or replace function auth.uid() returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create temp table rls_fixture (
  key text primary key,
  val text not null
);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'parent-a@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'parent-b@example.test');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
insert into rls_fixture (key, val)
select 'child_a', (public.create_signup_child('Ada', 3)->>'child_id');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);
insert into rls_fixture (key, val)
select 'child_b', (public.create_signup_child('Bea', 3)->>'child_id');

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', false);
select public.set_student_login(
  (select val::uuid from rls_fixture where key = 'child_a'),
  'ada',
  '2468'
);

select set_config('request.headers', '{"x-device-key":"deviceok01"}', false);
insert into rls_fixture (key, val)
select 'token_a', public.start_student_session_by_name('Ada', '2468');

do $$
begin
  if (select val from rls_fixture where key = 'token_a') is null
     or (select val from rls_fixture where key = 'token_a') = 'locked'
     or (select val from rls_fixture where key = 'token_a') !~ '^[0-9a-f]{64}$' then
    raise exception 'expected a student token for Ada, got %', (select val from rls_fixture where key = 'token_a');
  end if;
end $$;

insert into public.attempts (child_id, skill_id, prompt, expected, given, correct)
select val::uuid, 'g3-place', 'hidden prompt', '4', '4', true
from rls_fixture where key = 'child_a'
returning id::text as attempt_id \gset

insert into rls_fixture (key, val) values ('attempt_a', :'attempt_id');

insert into public.skill_states (child_id, skill_id, attempted, correct, consecutive_correct)
select val::uuid, 'g3-place', 4, 3, 2 from rls_fixture where key = 'child_a';

insert into public.practice_events (child_id, kind, skill_id)
select val::uuid, 'question_attempted', 'g3-place' from rls_fixture where key = 'child_a';

insert into public.lesson_runs (child_id, skill_id, stage)
select val::uuid, 'g3-place', 'practice' from rls_fixture where key = 'child_a';

insert into public.talk_samples (child_id, kind, skill_id, prompt, answer)
select val::uuid, 'solved', 'g3-place', 'What is 2 + 2?', '4' from rls_fixture where key = 'child_a';

insert into public.worksheets (owner_id, access_code, title, instructions, items)
values ('11111111-1111-4111-8111-111111111111', 'ABCD12', 'Review', '', '[]'::jsonb);

grant select on rls_fixture to anon, authenticated;

-- Parent B cannot read or write parent A's rows by id.
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', false);

do $$
declare
  n int;
  child_a uuid := (select val::uuid from rls_fixture where key = 'child_a');
  attempt_a uuid := (select val::uuid from rls_fixture where key = 'attempt_a');
begin
  select count(*) into n from public.children where id = child_a;
  if n <> 0 then raise exception 'parent B read parent A child'; end if;

  select count(*) into n from public.attempts where id = attempt_a;
  if n <> 0 then raise exception 'parent B read parent A attempt'; end if;

  select count(*) into n from public.skill_states where child_id = child_a;
  if n <> 0 then raise exception 'parent B read parent A mastery'; end if;

  select count(*) into n from public.practice_events where child_id = child_a;
  if n <> 0 then raise exception 'parent B read parent A practice event'; end if;

  select count(*) into n from public.lesson_runs where child_id = child_a;
  if n <> 0 then raise exception 'parent B read parent A lesson'; end if;

  select count(*) into n from public.talk_samples where child_id = child_a;
  if n <> 0 then raise exception 'parent B read parent A talk sample'; end if;

  select count(*) into n from public.student_sessions where child_id = child_a;
  if n <> 0 then raise exception 'parent B read parent A session'; end if;

  select count(*) into n from public.worksheets where access_code = 'ABCD12';
  if n <> 0 then raise exception 'parent B read parent A worksheet'; end if;

  select count(*) into n from public.children where id = (select val::uuid from rls_fixture where key = 'child_b');
  if n <> 1 then raise exception 'parent B could not read their own child'; end if;

  begin
    insert into public.attempts (child_id, skill_id, prompt, expected, given, correct)
    values (child_a, 'g3-place', 'nope', '1', '1', false);
    raise exception 'parent B inserted an attempt for parent A';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    perform public.set_student_login(child_a, 'taken', '9999');
    raise exception 'parent B set a PIN on parent A child';
  exception
    when others then
      if sqlerrm not like '%not on this account%' then
        raise;
      end if;
  end;
end $$;

do $$
begin
  perform token_hash from public.student_sessions limit 1;
  raise exception 'authenticated role read token_hash';
exception
  when insufficient_privilege then
    null;
end $$;

reset role;

-- Student A can read their own child and cannot read child B.
do $$
begin
  perform set_config(
    'request.headers',
    json_build_object(
      'x-student-token', (select val from rls_fixture where key = 'token_a'),
      'x-device-key', 'deviceok01'
    )::text,
    false
  );
end $$;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

do $$
declare
  n int;
  child_a uuid := (select val::uuid from rls_fixture where key = 'child_a');
  child_b uuid := (select val::uuid from rls_fixture where key = 'child_b');
begin
  select count(*) into n from public.children where id = child_a;
  if n <> 1 then raise exception 'student A could not read their own profile'; end if;

  select count(*) into n from public.children where id = child_b;
  if n <> 0 then raise exception 'student A read student B profile'; end if;

  select count(*) into n from public.attempts where child_id = child_b;
  if n <> 0 then raise exception 'student A read student B attempts'; end if;

  begin
    insert into public.attempts (child_id, skill_id, prompt, expected, given, correct)
    values (child_b, 'g3-place', 'nope', '1', '1', false);
    raise exception 'student A inserted an attempt for student B';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

reset role;

-- Five wrong PINs lock the child name. A different device is locked after five of its own failures.
select set_config('request.headers', '{"x-device-key":"devicebad1"}', false);
do $$
declare
  i int;
  result text;
begin
  for i in 1..5 loop
    result := public.start_student_session_by_name('Ada', '0000');
    if result is not null then
      raise exception 'wrong PIN attempt % returned %', i, result;
    end if;
  end loop;
  result := public.start_student_session_by_name('Ada', '2468');
  if result is distinct from 'locked' then
    raise exception 'expected the child name to lock, got %', result;
  end if;
end $$;

select set_config('request.headers', '{"x-device-key":"devicebad2"}', false);
do $$
declare
  i int;
  result text;
begin
  for i in 1..5 loop
    result := public.open_practice_set('ZZZZ');
    if result is not null then
      raise exception 'bad practice code attempt % returned a set', i;
    end if;
  end loop;
  if public.open_practice_set('ABCD12') is not null then
    raise exception 'device should be locked out of practice sets';
  end if;
end $$;

select set_config('request.headers', '{"x-device-key":"deviceok02"}', false);
do $$
begin
  if public.open_practice_set('ABCD12') is null then
    raise exception 'a fresh device should still open a real practice set';
  end if;
end $$;
