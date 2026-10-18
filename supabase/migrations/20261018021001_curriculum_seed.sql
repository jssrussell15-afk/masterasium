-- Seed jurisdictions, curriculum documents, and the dates each document is in force.
-- Does not load standards or skills. Those imports are later prompts.
-- last_verified is 2026-10-17, the date these sources were extracted
-- (see data/curriculum/README.md). The prompt requires the column and does not
-- give a separate date.

insert into public.jurisdiction (code, slug, name, display_order, publish_status, note)
values
  -- display_order matches the province pill order. Quebec is last because it is hidden.
  ('ON', 'ontario', 'Ontario', 1, 'published', null),
  ('BC', 'british-columbia', 'British Columbia', 2, 'coming_soon', null),
  ('AB', 'alberta', 'Alberta', 3, 'coming_soon', null),
  ('SK', 'saskatchewan', 'Saskatchewan', 4, 'coming_soon', null),
  ('MB', 'manitoba', 'Manitoba', 5, 'coming_soon', null),
  ('NS', 'nova-scotia', 'Nova Scotia', 6, 'coming_soon', null),
  ('PE', 'prince-edward-island', 'Prince Edward Island', 7, 'coming_soon', null),
  ('NB', 'new-brunswick', 'New Brunswick', 8, 'coming_soon', null),
  ('NL', 'newfoundland-and-labrador', 'Newfoundland and Labrador', 9, 'coming_soon', null),
  ('YT', 'yukon', 'Yukon', 10, 'coming_soon', null),
  ('NT', 'northwest-territories', 'Northwest Territories', 11, 'coming_soon', null),
  ('NU', 'nunavut', 'Nunavut', 12, 'coming_soon', null),
  ('QC', 'quebec', 'Quebec', 13, 'hidden', 'Hidden. The site excludes Quebec.');

insert into public.curriculum_doc (
  doc_key, owner_jurisdiction, title, publisher, published_year, source_url, status, last_verified, notes
)
values
  (
    'ON-MATH-2020',
    'ON',
    'The Ontario Curriculum, Grades 1-8: Mathematics (2020)',
    'Ontario Ministry of Education',
    2020,
    'https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics',
    'current',
    date '2026-10-17',
    null
  ),
  (
    'BC-MATH-K9-2016',
    'BC',
    'BC Mathematics K-9 (redesigned curriculum)',
    'BC Ministry of Education and Child Care',
    2016,
    'https://curriculum.gov.bc.ca/curriculum/mathematics',
    'current',
    date '2026-10-17',
    null
  ),
  (
    'AB-MATH-K6-2022',
    'AB',
    'Alberta Mathematics Kindergarten to Grade 6',
    'Alberta Education',
    2022,
    'https://curriculum.learnalberta.ca/cdn/curriculum/gfc-mat.json',
    'current',
    date '2026-10-17',
    'Rendered at https://curriculum.learnalberta.ca/curriculum/en/c/mat3 and the other grade pages.'
  ),
  (
    'AB-MATH-K9-2016',
    'AB',
    'Alberta Mathematics Kindergarten to Grade 9 Program of Studies (2007, updated 2016)',
    'Alberta Education',
    2016,
    'https://curriculum.learnalberta.ca/cdn/assets/public/ef066215-6eae-5350-8ba0-f9fe82004ee8/mathematics-7-to-9.pdf',
    'being_replaced',
    date '2026-10-17',
    null
  ),
  (
    'AB-MATH-7-9-NEW',
    'AB',
    'Alberta Mathematics 7-9 (new; draft on LearnAlberta)',
    'Alberta Education',
    null,
    'https://curriculum.learnalberta.ca/cdn/cia/curriculum-definition/definitions.json',
    'draft',
    date '2026-10-17',
    'LearnAlberta entry MAT_7-9, status DRAFT. No standards in this seed.'
  ),
  (
    'SK-MATH-1-8',
    'SK',
    'Saskatchewan Mathematics 1-8',
    'Saskatchewan Ministry of Education',
    null,
    'https://curriculum.gov.sk.ca/',
    'current',
    date '2026-10-17',
    null
  ),
  (
    'MB-MATH-K8-2013',
    'MB',
    'Kindergarten to Grade 8 Mathematics: Manitoba Curriculum Framework of Outcomes (2013)',
    'Manitoba Education',
    2013,
    'https://www.edu.gov.mb.ca/k12/cur/math/framework_k-8/index.html',
    'current',
    date '2026-10-17',
    null
  ),
  (
    'NS-MATH-2022',
    'NS',
    'Nova Scotia Mathematics 1-8 Outcomes (2022)',
    'NS Department of Education and Early Childhood Development',
    2022,
    'https://curriculum.novascotia.ca/',
    'current',
    date '2026-10-17',
    null
  ),
  (
    'PE-MATH-2024',
    'PE',
    'PEI Mathematics Curriculum Grades 1-8',
    'PEI Department of Education and Early Years',
    2024,
    'https://www.princeedwardisland.ca/sites/default/files/publications/eelc_math_1.pdf',
    'current',
    date '2026-10-17',
    'One PDF per grade: eelc_math_<grade>.pdf. source_url points at the Grade 1 PDF.'
  ),
  (
    'NU-MATH-K3',
    'NU',
    'Nunavut K-3 mathematics (own curriculum)',
    'Nunavut Department of Education',
    null,
    'https://www.gov.nu.ca/sites/default/files/documents/2024-10/Nunavut_Approved_Curriculum_and_Teaching_Resources__2024-2025_v2.pdf',
    'unverified',
    date '2026-10-17',
    'Unverified. Grades 1-3 use this document. Grades 4-8 point at AB-MATH-K9-2016.'
  );

-- ON-MATH-2020 -> ON grades 1-8, from 2020-09-01, open-ended.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select d.id, 'ON', g, date '2020-09-01', null, null
from public.curriculum_doc d
cross join generate_series(1, 8) as g
where d.doc_key = 'ON-MATH-2020';

-- BC-MATH-K9-2016 -> BC grades 1-8 and YT grades 1-8, from 2016-09-01, open-ended.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select d.id, j.code, g, date '2016-09-01', null, null
from public.curriculum_doc d
cross join (values ('BC'), ('YT')) as j (code)
cross join generate_series(1, 8) as g
where d.doc_key = 'BC-MATH-K9-2016';

-- BC-MATH-K9-2016 -> NT grades 4-8, from 2016-09-01.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select
  d.id,
  'NT',
  g,
  date '2016-09-01',
  null,
  'NWT uses BC curriculum for grades 4-9; confirm the start year before publishing NT'
from public.curriculum_doc d
cross join generate_series(4, 8) as g
where d.doc_key = 'BC-MATH-K9-2016';

-- AB-MATH-K6-2022 -> AB grades 1-3 from 2022-09-01; grades 4-6 from 2023-09-01; open-ended.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select d.id, 'AB', g, date '2022-09-01', null, null
from public.curriculum_doc d
cross join generate_series(1, 3) as g
where d.doc_key = 'AB-MATH-K6-2022';

insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select d.id, 'AB', g, date '2023-09-01', null, null
from public.curriculum_doc d
cross join generate_series(4, 6) as g
where d.doc_key = 'AB-MATH-K6-2022';

-- AB-MATH-K9-2016 -> AB grades 7-8, tracking start 2024-09-01, through 2027-08-31 inclusive.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select
  d.id,
  'AB',
  g,
  date '2024-09-01',
  date '2027-08-31',
  '2024-09-01 is when Masterasium starts tracking, not the official implementation date.'
from public.curriculum_doc d
cross join generate_series(7, 8) as g
where d.doc_key = 'AB-MATH-K9-2016';

-- AB-MATH-7-9-NEW -> AB grades 7-8 from 2027-09-01, open-ended. No standards yet.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select
  d.id,
  'AB',
  g,
  date '2027-09-01',
  null,
  'No standards yet. The page shows Coming soon for these grades from this date until the new data is loaded.'
from public.curriculum_doc d
cross join generate_series(7, 8) as g
where d.doc_key = 'AB-MATH-7-9-NEW';

-- SK, MB, NS, PE grades 1-8 from 2024-09-01, open-ended.
-- 2024-09-01 is when Masterasium starts tracking, not the official implementation date.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select
  d.id,
  d.owner_jurisdiction,
  g,
  date '2024-09-01',
  null,
  '2024-09-01 is when Masterasium starts tracking, not the official implementation date.'
from public.curriculum_doc d
cross join generate_series(1, 8) as g
where d.doc_key in ('SK-MATH-1-8', 'MB-MATH-K8-2013', 'NS-MATH-2022', 'PE-MATH-2024');

-- Nunavut. Official in-force dates are not in the source list, so none are invented.
-- effective_from is -infinity (not a calendar date) and effective_to is null, so the
-- row is open-ended and current_doc matches any check date. Replace -infinity when
-- Nunavut's dates are confirmed.
insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select
  d.id,
  'NU',
  g,
  '-infinity'::date,
  null,
  'Official in-force dates are not recorded. effective_from is unbounded so this seed does not invent a Nunavut start date. effective_to is open-ended.'
from public.curriculum_doc d
cross join generate_series(1, 3) as g
where d.doc_key = 'NU-MATH-K3';

insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, effective_to, note)
select
  d.id,
  'NU',
  g,
  '-infinity'::date,
  null,
  'Official in-force dates are not recorded. effective_from is unbounded so this seed does not invent a Nunavut start date. Grades 4-8 follow AB-MATH-K9-2016 until Nunavut announces its own curriculum. effective_to is open-ended.'
from public.curriculum_doc d
cross join generate_series(4, 8) as g
where d.doc_key = 'AB-MATH-K9-2016';

-- When Nunavut announces its own grade 4 curriculum, close the Alberta row on the
-- last day that program remains in force and insert the new document from the next
-- day. Dates below are placeholders, not real Nunavut dates. Do not invent them.
--
-- update public.doc_applicability
-- set effective_to = '<last day the Alberta program remains in force for NU grade 4>'
-- where jurisdiction_code = 'NU'
--   and grade = 4
--   and doc_id = (select id from public.curriculum_doc where doc_key = 'AB-MATH-K9-2016');
--
-- insert into public.doc_applicability (doc_id, jurisdiction_code, grade, effective_from, note)
-- values (
--   (select id from public.curriculum_doc where doc_key = 'NU-MATH-<grade 4 doc key>'),
--   'NU',
--   4,
--   '<the following day>',
--   'Nunavut''s own grade 4 curriculum, from the date Nunavut announces.'
-- );
