-- Curriculum integrity checks against a local database loaded with supabase/migrations.
-- Do not run this against the hosted Supabase project.
\set ON_ERROR_STOP on
\pset pager off
\ir curriculum_qa_function.sql

select check_id, check_name, status, failures, sample_ids
from pg_temp.curriculum_qa_report()
order by check_id;

do $$
declare
  bad int;
begin
  select count(*) into bad from pg_temp.curriculum_qa_report() where status <> 'pass';
  if bad > 0 then
    raise exception 'curriculum integrity SQL checks failed (% checks)', bad;
  end if;
end $$;
