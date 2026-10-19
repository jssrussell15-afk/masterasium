-- Confirms a student can mark only their own learning_applied flag, and only once.
-- Rolls the fixture back. Do not run this against the hosted Supabase project.
\set ON_ERROR_STOP on

begin;

do $$
declare
  v_parent uuid := gen_random_uuid();
  v_child uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_attempt uuid := gen_random_uuid();
  v_other_attempt uuid := gen_random_uuid();
  v_hit uuid;
  v_again uuid;
  v_other_hit uuid;
begin
  if (
    select count(*)
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'attempts'
      and grantee = 'anon'
      and privilege_type = 'UPDATE'
  ) <> 1 then
    raise exception 'anon update on attempts must be one column';
  end if;

  if not exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'attempts'
      and grantee = 'anon'
      and privilege_type = 'UPDATE'
      and column_name = 'learning_applied'
  ) then
    raise exception 'anon cannot update learning_applied';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attempts'
      and policyname = 'students mark learning applied'
      and cmd = 'UPDATE'
      and 'anon' = any (roles)
      and qual like '%current_student_id%'
      and with_check like '%current_student_id%'
  ) then
    raise exception 'missing student learning_applied update policy';
  end if;

  insert into auth.users (id, email) values (v_parent, 'rls-parent@example.com');
  insert into public.children (id, parent_id, first_name, grade, working_grade)
  values (v_child, v_parent, 'Sam', 3, 3), (v_other, v_parent, 'Max', 3, 3);
  insert into public.attempts (
    id, child_id, skill_id, prompt, expected, given, correct, client_attempt_id, learning_applied
  ) values
    (v_attempt, v_child, 'add-within-20', '1+1', '2', '2', true, '11111111-1111-4111-8111-111111111111', false),
    (v_other_attempt, v_other, 'add-within-20', '2+2', '4', '4', true, '22222222-2222-4222-8222-222222222222', false);

  execute format(
    'create or replace function public.current_student_id() returns uuid language sql stable as $fn$ select %L::uuid $fn$',
    v_child
  );

  execute 'set local role anon';

  update public.attempts
    set learning_applied = true
    where id = v_attempt
      and learning_applied = false
    returning id into v_hit;
  if v_hit is distinct from v_attempt then
    raise exception 'anon could not mark learning_applied';
  end if;

  update public.attempts
    set learning_applied = true
    where id = v_attempt
      and learning_applied = false
    returning id into v_again;
  if v_again is not null then
    raise exception 'learning_applied flipped twice';
  end if;

  update public.attempts
    set learning_applied = true
    where id = v_other_attempt
      and learning_applied = false
    returning id into v_other_hit;
  if v_other_hit is not null then
    raise exception 'anon marked another child''s attempt';
  end if;

  begin
    update public.attempts set prompt = 'changed' where id = v_attempt;
    raise exception 'anon updated prompt';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

rollback;
