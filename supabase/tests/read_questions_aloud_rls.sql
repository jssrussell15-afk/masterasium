-- A parent can set read_questions_aloud only on their own child, and only through the function.
-- The migration must not add an UPDATE policy on children.
-- Rolls the fixture back. Do not run this against the hosted Supabase project.
\set ON_ERROR_STOP on

begin;

do $$
declare
  v_parent uuid := gen_random_uuid();
  v_other_parent uuid := gen_random_uuid();
  v_child uuid := gen_random_uuid();
  v_other uuid := gen_random_uuid();
  v_value boolean;
  v_other_value boolean;
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'children'
      and cmd = 'UPDATE'
  ) then
    raise exception 'children must not have an update policy';
  end if;

  if exists (
    select 1
    from information_schema.column_privileges
    where table_schema = 'public'
      and table_name = 'children'
      and column_name = 'read_questions_aloud'
      and privilege_type = 'UPDATE'
      and grantee in ('authenticated', 'anon', 'PUBLIC')
  ) then
    raise exception 'read_questions_aloud must not have a column update grant';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_read_questions_aloud'
      and p.prosecdef
      and 'search_path=public' = any (p.proconfig)
  ) then
    raise exception 'set_read_questions_aloud must be security definer with search_path public';
  end if;

  if exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'set_read_questions_aloud'
      and grantee in ('PUBLIC', 'anon')
      and privilege_type = 'EXECUTE'
  ) then
    raise exception 'set_read_questions_aloud is executable by public or anon';
  end if;

  if not exists (
    select 1
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'set_read_questions_aloud'
      and grantee = 'authenticated'
      and privilege_type = 'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute set_read_questions_aloud';
  end if;

  insert into auth.users (id, email) values
    (v_parent, 'aloud-parent@example.com'),
    (v_other_parent, 'aloud-other@example.com');
  insert into public.children (id, parent_id, first_name, grade, working_grade)
  values
    (v_child, v_parent, 'Sam', 1, 1),
    (v_other, v_other_parent, 'Max', 3, 3);

  execute format(
    'create or replace function auth.uid() returns uuid language sql stable as $fn$ select %L::uuid $fn$',
    v_parent
  );
  execute 'set local role authenticated';

  perform public.set_read_questions_aloud(v_child, true);
  select read_questions_aloud into v_value from public.children where id = v_child;
  if v_value is distinct from true then
    raise exception 'parent could not turn read aloud on';
  end if;

  perform public.set_read_questions_aloud(v_child, false);
  select read_questions_aloud into v_value from public.children where id = v_child;
  if v_value is distinct from false then
    raise exception 'parent could not turn read aloud off';
  end if;

  perform public.set_read_questions_aloud(v_child, null);
  select read_questions_aloud into v_value from public.children where id = v_child;
  if v_value is not null then
    raise exception 'parent could not reset read aloud to the grade default';
  end if;

  begin
    perform public.set_read_questions_aloud(v_other, true);
    raise exception 'parent changed another child';
  exception
    when others then
      if sqlerrm not like '%not on this account%' then
        raise;
      end if;
  end;

  execute 'reset role';
  select read_questions_aloud into v_other_value from public.children where id = v_other;
  if v_other_value is not null then
    raise exception 'another child changed';
  end if;

  execute 'set local role anon';
  begin
    perform public.set_read_questions_aloud(v_child, true);
    raise exception 'anon executed set_read_questions_aloud';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;

rollback;
