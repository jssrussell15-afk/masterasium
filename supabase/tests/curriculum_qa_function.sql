-- Read-only curriculum integrity checks. Creates a temporary function and does not change data.
-- HTML checks (visible chips, footer text, pills, axe) run in tests/curriculum.
create or replace function pg_temp.curriculum_qa_report()
returns table (check_id text, check_name text, status text, failures int, sample_ids text)
language plpgsql
as $fn$
declare
  ids text[];
  n int;
begin
  select coalesce(array_agg(s.slug order by s.slug), '{}')
    into ids
  from public.skill s
  left join public.alignment a on a.skill_id = s.id
  where a.skill_id is null;
  check_id := '1'; check_name := 'Every skill links to a standard'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  select coalesce(array_agg(s.id::text order by s.id::text), '{}')
    into ids
  from public.standard s
  where s.source_url is null
     or s.source_url not like 'https://%'
     or substring(s.source_url from '^https://([^/]+)') not in (
       'www.dcp.edu.gov.on.ca',
       'assets-us-01.kc-usercontent.com',
       'curriculum.gov.bc.ca',
       'curriculum.learnalberta.ca',
       'curriculum.gov.sk.ca',
       'www.edu.gov.mb.ca',
       'curriculum.novascotia.ca',
       'www.princeedwardisland.ca'
     );
  check_id := '2'; check_name := 'Standard sources use an allowed https host'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  select coalesce(array_agg(s.id::text order by s.id::text), '{}')
    into ids
  from public.standard s
  join public.curriculum_doc d on d.id = s.doc_id
  where (
      s.code_type = 'official'
      and d.doc_key not in ('ON-MATH-2020', 'SK-MATH-1-8', 'MB-MATH-K8-2013', 'NS-MATH-2022', 'PE-MATH-2024')
    )
    or (
      s.code_type = 'official'
      and (
        (d.doc_key = 'ON-MATH-2020' and s.code !~ '^[A-F][0-9](\.[0-9]{1,2})?$')
        or (d.doc_key = 'SK-MATH-1-8' and s.code !~ '^(N|P|SS|SP)[1-8]\.[0-9]{1,2}$')
        or (d.doc_key = 'MB-MATH-K8-2013' and s.code !~ '^[1-8]\.(N|PR|SS|SP)\.[0-9]{1,2}$')
        or (d.doc_key = 'NS-MATH-2022' and s.code !~ '^(N|PR|M|G|SP)[0-9]{2}$')
        or (d.doc_key = 'PE-MATH-2024' and s.code !~ '^[1-8]\.(N|PR|SS|SP)[0-9]{1,2}$')
      )
    );
  check_id := '3'; check_name := 'Official codes stay on official documents and match the format'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  ids := '{}';
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'ON-MATH-2020' and s.level = 'specific') <> 369 then
    ids := ids || 'count:ON-specific';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'ON-MATH-2020' and s.code = 'A1') <> 8 then
    ids := ids || 'count:ON-A1';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'BC-MATH-K9-2016') <> 294 then
    ids := ids || 'count:BC';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'BC-MATH-K9-2016' and s.level = 'content') <> 120 then
    ids := ids || 'count:BC-content';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'BC-MATH-K9-2016' and s.level = 'competency') <> 134 then
    ids := ids || 'count:BC-competency';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'BC-MATH-K9-2016' and s.level = 'big_idea') <> 40 then
    ids := ids || 'count:BC-big-idea';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'AB-MATH-K6-2022') <> 68 then
    ids := ids || 'count:AB-K6';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'AB-MATH-K9-2016') <> 42 then
    ids := ids || 'count:AB-legacy';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'SK-MATH-1-8') <> 125 then
    ids := ids || 'count:SK';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'MB-MATH-K8-2013') <> 186 then
    ids := ids || 'count:MB';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'NS-MATH-2022') <> 173 then
    ids := ids || 'count:NS';
  end if;
  if (select count(*) from public.standard s join public.curriculum_doc d on d.id = s.doc_id where d.doc_key = 'PE-MATH-2024') <> 145 then
    ids := ids || 'count:PE';
  end if;
  select ids || coalesce(array_agg(s.id::text order by s.id::text), '{}')
    into ids
  from public.standard s
  join public.curriculum_doc d on d.id = s.doc_id
  where d.doc_key in ('BC-MATH-K9-2016', 'AB-MATH-K6-2022', 'AB-MATH-K9-2016')
    and s.code_type <> 'derived';
  check_id := '4'; check_name := 'Counts match the source files and derived docs stay derived'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  select coalesce(array_agg(distinct s.slug order by s.slug), '{}')
    into ids
  from public.skill s
  join public.alignment a on a.skill_id = s.id
  join public.standard st on st.id = a.standard_id
  join public.curriculum_doc d on d.id = st.doc_id
  where d.doc_key = 'ON-MATH-2020'
    and st.grade = 3
    and (s.title like '%10×10%' or s.title ilike '%remainder%');
  if not exists (
    select 1
    from public.alignment a
    join public.standard st on st.id = a.standard_id
    join public.curriculum_doc d on d.id = st.doc_id
    where d.doc_key = 'ON-MATH-2020' and st.grade = 4 and st.code = 'B2.2'
  ) then
    ids := ids || 'missing:ON:4:B2.2';
  end if;
  select ids || coalesce(array_agg(distinct s.slug), '{}')
    into ids
  from public.skill s
  join public.alignment a4 on a4.skill_id = s.id
  join public.standard g4 on g4.id = a4.standard_id and g4.grade = 4
  join public.curriculum_doc d4 on d4.id = g4.doc_id and d4.doc_key = 'ON-MATH-2020'
  join public.alignment a5 on a5.skill_id = s.id
  join public.standard g5 on g5.id = a5.standard_id and g5.grade = 5 and g5.code = 'B2.5'
  join public.curriculum_doc d5 on d5.id = g5.doc_id and d5.doc_key = 'ON-MATH-2020';
  select ids || coalesce(array_agg(distinct s.slug), '{}')
    into ids
  from public.skill s
  join public.alignment a on a.skill_id = s.id
  join public.standard st on st.id = a.standard_id and st.grade = 5
  join public.curriculum_doc d on d.id = st.doc_id and d.doc_key = 'ON-MATH-2020'
  where s.title like '%Volume%';
  check_id := '5'; check_name := 'Ontario placement regressions'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  select coalesce(array_agg(st.id::text order by st.code), '{}')
    into ids
  from public.standard st
  join public.curriculum_doc d on d.id = st.doc_id
  join public.sequence q on q.doc_id = d.id and q.grade = st.grade and q.is_published
  where st.level = 'specific'
    and not exists (
      select 1 from public.sequence_item si
      where si.sequence_id = q.id and si.standard_id = st.id
    );
  select ids || coalesce(array_agg(q.id::text), '{}')
    into ids
  from public.sequence q
  where q.is_published
    and (
      q.label <> 'Suggested by Masterasium'
      or exists (
        select 1
        from generate_series(1, (select max(si.position) from public.sequence_item si where si.sequence_id = q.id)) as g(n)
        where not exists (
          select 1 from public.sequence_item si where si.sequence_id = q.id and si.position = g.n
        )
      )
    );
  check_id := '6'; check_name := 'Published sequences cover every specific expectation'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  ids := '{}';
  if (select d.doc_key from public.curriculum_doc d where d.id = public.current_doc('AB', 7, date '2027-08-31')) is distinct from 'AB-MATH-K9-2016' then
    ids := ids || 'AB:7:2027-08-31';
  end if;
  if (select d.doc_key from public.curriculum_doc d where d.id = public.current_doc('AB', 7, date '2027-09-01')) is distinct from 'AB-MATH-7-9-NEW' then
    ids := ids || 'AB:7:2027-09-01';
  end if;
  if (select d.doc_key from public.curriculum_doc d where d.id = public.current_doc('YT', 5, current_date)) is distinct from 'BC-MATH-K9-2016' then
    ids := ids || 'YT:5:today';
  end if;
  select ids || coalesce(array_agg(distinct a.jurisdiction_code || ':' || a.grade::text), '{}')
    into ids
  from public.doc_applicability a
  join public.doc_applicability b
    on a.id < b.id
   and a.jurisdiction_code = b.jurisdiction_code
   and a.grade = b.grade
   and daterange(a.effective_from, coalesce(a.effective_to, 'infinity'::date), '[]')
       && daterange(b.effective_from, coalesce(b.effective_to, 'infinity'::date), '[]');
  check_id := '8'; check_name := 'Effective dates'; n := coalesce(array_length(ids, 1), 0);
  status := case when n = 0 then 'pass' else 'fail' end; failures := n; sample_ids := array_to_string(ids[1:5], ', ');
  return next;

  return;
end
$fn$;
