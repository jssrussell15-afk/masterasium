-- Confirms checks 3 and 4 fail when one BC standard is marked official. Rolls the change back.
-- Do not run this against the hosted Supabase project.
\set ON_ERROR_STOP on
\ir curriculum_qa_function.sql

begin;

do $$
declare
  target uuid;
  failed3 boolean := false;
  failed4 boolean := false;
  report record;
begin
  select s.id
    into target
  from public.standard s
  join public.curriculum_doc d on d.id = s.doc_id
  where d.doc_key = 'BC-MATH-K9-2016'
  order by s.grade, s.code
  limit 1;

  update public.standard set code_type = 'official' where id = target;

  for report in select * from pg_temp.curriculum_qa_report() loop
    if report.check_id = '3' and report.status = 'fail' and position(target::text in report.sample_ids) > 0 then
      failed3 := true;
    end if;
    if report.check_id = '4' and report.status = 'fail' and position(target::text in report.sample_ids) > 0 then
      failed4 := true;
    end if;
  end loop;

  if not failed3 or not failed4 then
    raise exception 'expected checks 3 and 4 to fail for BC standard %', target;
  end if;
end $$;

rollback;
