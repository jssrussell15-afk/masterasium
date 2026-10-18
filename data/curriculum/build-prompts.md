# Masterasium: multi-province build prompts

Before you run these prompts, copy the data files below into the repo at `data/curriculum/`. Every prompt that imports data reads from that folder. All files were extracted on 2026-10-17 from the official sources named in each row's `source_url`.

| File | Rows | What it is |
|---|---|---|
| ontario-2020.json / .csv | 377 | Ontario 2020 math, Grades 1-8: 369 specific expectations (strands B-F) + 8 A1 rows (one per grade) |
| ontario-skill-corrections.json | 64 | Every current Masterasium Ontario skill mapped to verified codes, with the fix to make |
| ontario-g3-sequence.json | 10 blocks | Suggested Grade 3 teaching order (covers all 46 Grade 3 expectations + A1) |
| bc-yukon-2016.json / .csv | 294 | BC Math K-9, Grades 1-8: 120 content, 134 curricular competencies, 40 big ideas (derived keys) |
| alberta-k6-2022.json / .csv | 68 | Alberta new K-6 math, Grades 1-6 learning outcomes with knowledge / understanding / skills & procedures (derived keys) |
| alberta-7-8-legacy-2016.json / .csv | 42 | Alberta Math 7-9 Program of Studies (2007, updated 2016), Grades 7-8 specific outcomes (derived keys), effective_to 2027-08-31 |
| saskatchewan.json / .csv | 125 | Saskatchewan Mathematics 1-8 outcomes (official codes such as N3.1) |
| manitoba.json / .csv | 186 | Manitoba K-8 Framework of Outcomes (2013), Grades 1-8 (official codes such as 3.N.1) |
| nova-scotia-2022.json / .csv | 173 | Nova Scotia Mathematics 1-8 Outcomes (2022) (official codes such as N01) |
| pei-2024.json / .csv | 145 | PEI Mathematics Curriculum Grades 1-8 (2024 guides) (official codes such as 3.N1) |
| grade3-starter-alignments.csv | 58 | Reviewed Grade 3 skill-to-standard alignments across ON, BC, AB, SK, MB, NS, PE |

---

## 1. Data model: shared skill bank, curriculum documents, standards, alignments, sequences

```
Create Supabase SQL migrations for a multi-province curriculum model. Do not delete or rename the existing Ontario tables yet. Add the new tables next to them and leave the current pages working until prompt 2 switches them over.

Create migration supabase/migrations/<timestamp>_curriculum_model.sql with exactly these tables:

1. jurisdiction
   - code text primary key            -- 'ON','BC','YT','NT','AB','SK','MB','QC','NB','NS','PE','NL','NU'
   - slug text unique not null        -- 'ontario','british-columbia','yukon','northwest-territories','alberta','saskatchewan','manitoba','quebec','new-brunswick','nova-scotia','prince-edward-island','newfoundland-and-labrador','nunavut'
   - name text not null
   - display_order int not null
   - publish_status text not null check (publish_status in ('published','coming_soon','hidden'))
   - note text

2. curriculum_doc
   - id uuid primary key default gen_random_uuid()
   - doc_key text unique not null     -- e.g. 'ON-MATH-2020', 'BC-MATH-K9-2016', 'AB-MATH-K6-2022', 'AB-MATH-K9-2016', 'SK-MATH-1-8', 'MB-MATH-K8-2013', 'NS-MATH-2022', 'PE-MATH-2024'
   - owner_jurisdiction text not null references jurisdiction(code)
   - title text not null
   - publisher text not null
   - published_year int
   - source_url text not null
   - status text not null check (status in ('current','being_replaced','legacy','draft','unverified'))
   - last_verified date not null
   - notes text

3. doc_applicability   -- which document is in force for which jurisdiction + grade, and when
   - id uuid primary key default gen_random_uuid()
   - doc_id uuid not null references curriculum_doc(id) on delete cascade
   - jurisdiction_code text not null references jurisdiction(code)
   - grade int not null check (grade between 0 and 12)
   - effective_from date not null
   - effective_to date            -- null = open-ended; inclusive last day in force
   - note text
   - exclusion constraint (or a trigger) so one jurisdiction+grade never has two overlapping date ranges

4. strand
   - id uuid primary key default gen_random_uuid()
   - doc_id uuid not null references curriculum_doc(id) on delete cascade
   - code text not null           -- 'A'..'F' for Ontario; derived for others (e.g. 'N','PR','SS','SP')
   - code_type text not null check (code_type in ('official','derived'))
   - name text not null
   - display_order int not null
   - unique (doc_id, code)

5. standard
   - id uuid primary key default gen_random_uuid()
   - doc_id uuid not null references curriculum_doc(id) on delete cascade
   - strand_id uuid not null references strand(id)
   - grade int not null
   - code text not null           -- exactly as published (B2.5, 3.N.1, N01, 3.SS2) or a derived key (BC-MA-G3-C01, AB-G3-NUM-1, AB-G7-N-3)
   - code_type text not null check (code_type in ('official','derived'))
   - source_system_id text        -- e.g. LearnAlberta id 'MAT3-OI1-GQ1-LO1'; never displayed as a code
   - level text not null check (level in ('overall','specific','outcome','content','competency','big_idea'))
   - parent_id uuid references standard(id)
   - text text not null           -- verbatim wording from the source; never paraphrase
   - extra jsonb not null default '{}'  -- elaborations, knowledge/understanding/skills, process tags, notes
   - source_url text not null
   - display_order int not null
   - needs_review boolean not null default false
   - last_verified date not null
   - unique (doc_id, grade, code)

6. skill   -- the shared practice-skill bank, province-neutral
   - id uuid primary key default gen_random_uuid()
   - slug text unique not null
   - title text not null
   - description text
   - created_at timestamptz default now()

7. alignment
   - skill_id uuid references skill(id) on delete cascade
   - standard_id uuid references standard(id) on delete cascade
   - strength text not null check (strength in ('primary','partial'))
   - note text
   - reviewed_by text, reviewed_at timestamptz
   - primary key (skill_id, standard_id)

8. sequence   -- the suggested teaching order, kept separate from strand display
   - id uuid primary key default gen_random_uuid()
   - jurisdiction_code text not null references jurisdiction(code)
   - grade int not null
   - doc_id uuid not null references curriculum_doc(id)
   - label text not null default 'Suggested by Masterasium'
   - basis text not null          -- plain-language note on sources (board plans etc.)
   - version int not null default 1
   - effective_from date not null
   - effective_to date
   - is_published boolean not null default false

9. sequence_item
   - id uuid primary key default gen_random_uuid()
   - sequence_id uuid not null references sequence(id) on delete cascade
   - position int not null
   - block_title text not null
   - approx_weeks int
   - standard_id uuid references standard(id)
   - skill_id uuid references skill(id)
   - is_spiral boolean not null default false   -- true = revisit every block (facts, mental math)
   - check (standard_id is not null or skill_id is not null)
   - unique (sequence_id, position, standard_id, skill_id)

Add a SQL function current_doc(p_jurisdiction text, p_grade int, p_on date default current_date) returns uuid that picks the doc_applicability row whose range contains p_on. The strand view and sequence view must both call this function so a switch happens automatically on the effective date.

Enable RLS on all new tables: public read (anon select) on everything; writes only for the service role.

Seed (in a second migration <timestamp>_curriculum_seed.sql):
- 13 jurisdiction rows. publish_status: ON='published'; QC='hidden' (site excludes Quebec); all others 'coming_soon' for now.
- curriculum_doc rows:
  ON-MATH-2020 | The Ontario Curriculum, Grades 1-8: Mathematics (2020) | Ontario Ministry of Education | 2020 | https://www.dcp.edu.gov.on.ca/en/curriculum/elementary-mathematics | current
  BC-MATH-K9-2016 | BC Mathematics K-9 (redesigned curriculum) | BC Ministry of Education and Child Care | 2016 | https://curriculum.gov.bc.ca/curriculum/mathematics | current
  AB-MATH-K6-2022 | Alberta Mathematics Kindergarten to Grade 6 | Alberta Education | 2022 | https://curriculum.learnalberta.ca/cdn/curriculum/gfc-mat.json (rendered at https://curriculum.learnalberta.ca/curriculum/en/c/mat3 etc.) | current
  AB-MATH-K9-2016 | Alberta Mathematics Kindergarten to Grade 9 Program of Studies (2007, updated 2016) | Alberta Education | 2016 | https://curriculum.learnalberta.ca/cdn/assets/public/ef066215-6eae-5350-8ba0-f9fe82004ee8/mathematics-7-to-9.pdf | being_replaced
  AB-MATH-7-9-NEW | Alberta Mathematics 7-9 (new; draft on LearnAlberta) | Alberta Education | null | https://curriculum.learnalberta.ca/cdn/cia/curriculum-definition/definitions.json (entry MAT_7-9, status DRAFT) | draft
  SK-MATH-1-8 | Saskatchewan Mathematics 1-8 | Saskatchewan Ministry of Education | null | https://curriculum.gov.sk.ca/ | current
  MB-MATH-K8-2013 | Kindergarten to Grade 8 Mathematics: Manitoba Curriculum Framework of Outcomes (2013) | Manitoba Education | 2013 | https://www.edu.gov.mb.ca/k12/cur/math/framework_k-8/index.html | current
  NS-MATH-2022 | Nova Scotia Mathematics 1-8 Outcomes (2022) | NS Department of Education and Early Childhood Development | 2022 | https://curriculum.novascotia.ca/ | current
  PE-MATH-2024 | PEI Mathematics Curriculum Grades 1-8 | PEI Department of Education and Early Years | 2024 | https://www.princeedwardisland.ca/sites/default/files/publications/eelc_math_1.pdf (one PDF per grade: eelc_math_<grade>.pdf) | current
  NU-MATH-K3 | Nunavut K-3 mathematics (own curriculum) | Nunavut Department of Education | null | https://www.gov.nu.ca/sites/default/files/documents/2024-10/Nunavut_Approved_Curriculum_and_Teaching_Resources__2024-2025_v2.pdf | unverified
- doc_applicability rows:
  ON-MATH-2020 -> ON grades 1-8, from 2020-09-01, open-ended
  BC-MATH-K9-2016 -> BC grades 1-8 and YT grades 1-8, from 2016-09-01, open-ended
  BC-MATH-K9-2016 -> NT grades 4-8, from 2016-09-01, note 'NWT uses BC curriculum for grades 4-9; confirm the start year before publishing NT'
  AB-MATH-K6-2022 -> AB grades 1-3 from 2022-09-01; AB grades 4-6 from 2023-09-01; open-ended
  AB-MATH-K9-2016 -> AB grades 7-8, from 2024-09-01 (tracking start), effective_to 2027-08-31
  AB-MATH-7-9-NEW -> AB grades 7-8, from 2027-09-01, open-ended (it has no standards yet, so the page must show 'Coming soon' for those grades from that date until prompt 6 is re-run with the new data)
  SK-MATH-1-8 -> SK 1-8, MB-MATH-K8-2013 -> MB 1-8, NS-MATH-2022 -> NS 1-8, PE-MATH-2024 -> PE 1-8, all from 2024-09-01, open-ended. 2024-09-01 is when Masterasium starts tracking, not the official implementation date. Say that in doc_applicability.note.
  Nunavut: NU-MATH-K3 -> NU grades 1-3 open-ended; AB-MATH-K9-2016 -> NU grades 4-8 open-ended. When Nunavut announces its own grade 4, set effective_to on the NU grade-4 AB row and insert a NU-MATH row for grade 4 from the next day. Write this as a commented example in the seed file. Do not invent Nunavut dates.

Acceptance checks:
- supabase db reset runs both migrations with no errors.
- select current_doc('AB',7,'2027-08-31') returns AB-MATH-K9-2016; select current_doc('AB',7,'2027-09-01') returns AB-MATH-7-9-NEW.
- select current_doc('YT',3) returns BC-MATH-K9-2016.
- Inserting a second overlapping doc_applicability row for ('ON',3) fails.
- Inserting a standard with code_type 'official' and no code fails (not null).
- anon key can select from all new tables and cannot insert.
```

## 2. Ontario corrections, Grades 1-8 (official strands A-F and real expectation codes)

```
Switch the Ontario pages to the new model and fix the skill placements. Use only the data in data/curriculum/ontario-2020.json and data/curriculum/ontario-skill-corrections.json. Do not type any expectation text by hand.

Step 1: import Ontario.
- Write scripts/import-ontario.ts. It reads data/curriculum/ontario-2020.json (377 rows: grade, strand, strand_name, overall, overall_title, overall_text, topic, code, code_type, level, text, source_url, source_pdf, last_verified).
- Create the six strands for ON-MATH-2020 with official letters and these exact names and order:
  A Social-Emotional Learning (SEL) Skills in Mathematics and the Mathematical Processes
  B Number
  C Algebra
  D Data
  E Spatial Sense
  F Financial Literacy
- For each grade, insert the overall expectations (B1, B2, C1..C4, D1, D2, E1, E2, F1 and A1) as level 'overall' using overall_title and overall_text, then insert each specific expectation as level 'specific' with parent_id pointing at its overall expectation. Store topic (e.g. 'Whole Numbers', 'Math Facts', 'Coding Skills') in extra.topic. code_type is 'official' for every Ontario row.
- display_order: sort by strand letter, then overall number, then specific number (B2.10 after B2.9).
- C4 (Mathematical Modelling) is not in the JSON because it has no specific expectations. Insert it for every grade as level 'overall', code 'C4', title 'Mathematical Modelling', text exactly: 'apply the process of mathematical modelling to represent, analyse, make predictions, and provide insight into real-life situations'. Show it as a note under C. Algebra, not as a skill.

Step 2: create skills and alignments from ontario-skill-corrections.json (64 rows). For each row:
- action 'keep' / 'retitle' / 'remap' / 'move_strand' / 'reorder_first': create or update the skill with new_title and align it (strength 'primary') to every code in codes for that grade. The strand shown comes from the aligned standard, so a skill moves strand automatically.
- action 'split' (Grade 3 'Multiplication facts to 10×10'): rename the Grade 3 skill to 'Multiplication facts of 2, 5 and 10 (and related division facts)' aligned to Grade 3 B2.2; add a new Grade 3 skill 'Representing multiplication to 10 × 10 and division to 100 ÷ 10 with arrays' aligned to Grade 3 B2.6; create the skill 'Multiplication facts to 10×10' in Grade 4 aligned to Grade 4 B2.2 ('recall and demonstrate multiplication facts for 1 × 1 to 10 × 10, and related division facts').
- action 'move_grade' (Grade 3 'Division with remainders'): move the skill to Grade 4, aligned to Grade 4 B2.6 ('... expressing any remainder as a fraction when appropriate ...'). In Grade 3 add 'Multiplication and division problems (including groups of 1/2, 1/4, 1/3)' aligned to Grade 3 B2.7. No Grade 3 expectation mentions remainders.
- action 'delete': remove the skill from that grade only (Grade 4 'Adding and subtracting fractions with like denominators' is Grade 5 B2.5; Grade 5 'Volume of rectangular prisms' is Grade 7 E2.7). Apply replace_with where given (Grade 4 gets 'Repeated addition of unit fractions' aligned to Grade 4 B2.7).
- action 'merge' (Grade 8 'Surface area of cylinders'): merge into the Grade 8 E2.3 skill, and add a Grade 7 skill 'Surface area of cylinders' aligned to Grade 7 E2.6.
- Keep each skill's existing practice content and URLs. Only titles, grades and alignments change.

Step 3: add the strands the site is missing. For every grade, the page must show all of A-F. Where a specific expectation has no aligned practice skill yet, list the expectation itself with a muted 'Practice coming soon' tag. This adds, per grade: Algebra (C1 patterns, C2 equations and inequalities, C3 coding), Data (D1 data literacy, D2 probability), Spatial Sense (E1 geometric and spatial reasoning, E2 measurement), Financial Literacy (F1). A1 is shown once at the top as a short 'Throughout the year' note, not as a skill.

Step 4: page layout for /curriculum/ontario/grade-N (default view = strands).
- Strand headings use the letter: 'B. Number', 'C. Algebra', 'D. Data', 'E. Spatial Sense', 'F. Financial Literacy'.
- Each skill shows its code chips after the title, e.g. 'Addition and subtraction within 1,000  B2.4  B2.5'. Chips show the code exactly as stored. Clicking a chip opens a popover with the verbatim expectation text and a 'Source' link to source_url.
- Within a strand, order skills by the lowest display_order of their aligned standards. So Grade 3 Number now starts with 'Place value to 1,000' (B1.1) and fractions (B1.6, B1.7) come after the whole-number skills.
- Footer line on every page, in an element with data-testid="last-verified": 'Curriculum: The Ontario Curriculum, Grades 1-8: Mathematics (2020). Last verified 2026-10-17.' Take the date from curriculum_doc.last_verified. Build this footer as one shared component that every province page uses.

Acceptance checks:
- select count(*) from standard s join curriculum_doc d on d.id=s.doc_id where d.doc_key='ON-MATH-2020' and s.level='specific' returns 369.
- Grade 3 page: Number lists Place value first; B2.2 chip appears on the 2-5-10 facts skill; there is no '10×10 facts' skill in Grade 3; there is no 'Division with remainders' in Grade 3; Grade 4 shows both 'Multiplication facts to 10×10' (B2.2) and 'Division with remainders' (B2.6).
- Every grade page shows strands A-F in order, and Algebra shows a C3 coding item.
- Grade 4 has no 'Adding and subtracting fractions with like denominators'; Grade 5 has it with chip B2.5.
- Grade 5 has no volume skill; Grade 7 shows 'Volume of prisms and cylinders' with chip E2.7.
- Hovering or clicking a chip shows the exact text, e.g. Grade 3 B2.5: 'represent and solve problems involving the addition and subtraction of whole numbers that add up to no more than 1000, using various tools and algorithms'.
- No skill on any Ontario page lacks a code chip.
```

## 3. Suggested teaching sequence view (?view=sequence)

```
Add a second view to every curriculum grade page: /curriculum/<province>/grade-N?view=sequence. The default (no query string or ?view=strands) stays the strand view. The sequence view reads only from the sequence and sequence_item tables. It never changes strand order or strand data.

Data:
- Write scripts/import-sequence.ts that reads data/curriculum/ontario-g3-sequence.json and creates one sequence row (jurisdiction ON, grade 3, doc ON-MATH-2020, label 'Suggested by Masterasium', version 1, effective_from 2020-09-01, is_published true, basis = the file's basis text) and its sequence_item rows.
- Each block becomes items with the same position and block_title, one item per code (standard_id from Grade 3 Ontario), plus the aligned skill_id where one exists.
- spiral_every_block codes (B2.3 mental math, A1) and the spiral_from_block code (B2.2 facts of 2, 5 and 10, from block 4 on) are stored as is_spiral = true items in each relevant block.

The Ontario Grade 3 sequence (exactly as in the file):
1. Numbers to 1,000 (about 4 weeks): B1.1, B1.2, B1.4, B1.5, D1.2
2. Rounding, adding and subtracting within 1,000 (4): B1.3, B2.1, B2.4, B2.5, C2.3
3. Patterns, variables and equality (3): C1.1, C1.2, C1.3, C1.4, C2.1, C2.2
4. Multiplication and division concepts; money (4): B2.2, B2.6, B2.7, F1.1
5. 3D objects and perimeter (3): E1.1, E1.2, E1.3, E2.1, E2.2, E2.5
6. Fractions and scaling (4): B1.6, B1.7, B2.8, B2.9
7. Coding, location and movement (3): C3.1, C3.2, E1.4
8. Data and probability (3): D1.1, D1.3, D1.4, D1.5, D2.1, D2.2
9. Capacity, mass, area and time (4): E2.3, E2.4, E2.6, E2.7, E2.8, E2.9
10. Consolidation: multiplication, division and money problems (3): B2.5, B2.6, B2.7, B2.9, F1.1
Spiral in every block: B2.3 mental math (daily warm-up) and A1. Spiral from block 4 on: B2.2 facts of 2, 5 and 10.

UI:
- Add a two-option segmented control above the list: 'By strand' | 'Suggested order'. It updates the query string and keeps the province and grade. Show it only when a published sequence exists for this province+grade (current_doc on today's date). Otherwise hide it, and make ?view=sequence fall back to the strand view.
- Sequence view heading: 'Suggested order' with a visible badge 'Suggested by Masterasium'. Directly under it, show this visible text (not a tooltip): 'Ontario's curriculum lists expectations by strand and does not set a teaching order. This order is our suggestion, based on how Ontario school boards plan Grade 3: number and operations early, with facts and mental math practised all year. Your teacher's order may differ.'
- Render numbered blocks with block_title and '~N weeks'. Inside each block list the skills (with code chips) and any unaligned expectations with 'Practice coming soon'. Show spiral items as a compact 'Keep practising' row at the bottom of each block (B2.3 and, from block 4, B2.2).
- Each skill appears in exactly one main block. In block 10, where it reappears as review, show it under 'Review' instead.
- Add a 'Sources' disclosure at the bottom listing: Simcoe County DSB Grade 3 Course of Study (Aug 2020) and Dufferin-Peel CDSB Grade 3 Long-Range Plan (https://andrw.dpcdsb.org/download/519657).

Acceptance checks:
- /curriculum/ontario/grade-3?view=sequence shows 10 blocks in the order above, the 'Suggested by Masterasium' badge, and the visible disclaimer text.
- Block 1 lists the place-value skill; block 6 lists the fractions skill; 'Keep practising' shows B2.3 in every block and B2.2 in blocks 4-10.
- Every one of the 46 Grade 3 specific expectations appears in at least one block (write a test that checks this against the DB).
- /curriculum/ontario/grade-5?view=sequence (no sequence yet) shows the strand view and no toggle.
- Switching the toggle keeps the grade and province in the URL and does not reload strand data.
```

## 4. Province pills and routing

```
Make the province pills real links, driven by the jurisdiction table and by which grades have a current document with standards.

Routes:
- /curriculum/[province]/grade-[n] where [province] is a jurisdiction.slug: ontario, british-columbia, alberta, saskatchewan, manitoba, new-brunswick, nova-scotia, prince-edward-island, newfoundland-and-labrador, yukon, northwest-territories, nunavut. Quebec is excluded: no pill and no route (404).
- A grade is 'published' for a province when jurisdiction.publish_status = 'published' AND current_doc(code, n, today) returns a doc that has at least one standard for that grade.
- Unknown slug or unpublished grade: return 404 with links back to the published provinces. Do not redirect silently.
- Generate static params for every published province+grade. Revalidate daily so effective-date switches (Alberta 7-8 on 2027-09-01) take effect without a deploy.

Pills:
- Show the 12 pills in this order: Ontario, British Columbia, Alberta, Saskatchewan, Manitoba, Nova Scotia, Prince Edward Island, New Brunswick, Newfoundland and Labrador, Yukon, Northwest Territories, Nunavut.
- Published province: render <a href="/curriculum/<slug>/grade-<current n>"> so the grade is kept. If that grade is not published for the target province, link to the province's lowest published grade instead and add a visible line on arrival: 'Grade N isn't available for <Province> yet. Showing Grade M.'
- Coming-soon province: render a non-link <span aria-disabled="true"> whose visible text is '<Province> · Coming soon' (the words 'Coming soon' visible in the pill, smaller and muted). No tooltip-only state, no title attribute as the only cue.
- jurisdiction.publish_status = 'hidden': do not render the pill.
- Add a config flag SHOW_COMING_SOON_PILLS (default true). When false, coming-soon pills are not rendered.
- Selected pill: background #d3ebf7, border 2px solid using the site's existing primary blue (the same token used for links; do not add a new colour), aria-current="page". Unselected published pills keep today's style. Apply the same selected style to the grade pills.
- Grade pills link to /curriculum/<current slug>/grade-<n> and keep ?view= if present. Grades not published for this province render as non-link spans with visible 'Coming soon' text.
- Keyboard: pills are reachable by Tab in order, with a visible focus ring. Disabled spans are skipped (no tabindex).

Acceptance checks:
- With only ON published: the Ontario pill is a link and selected (#d3ebf7 fill, 2px blue border, aria-current="page"); the other 11 pills show the visible text 'Coming soon'; there is no Quebec pill.
- Set BC to 'published' in the DB: on /curriculum/ontario/grade-3?view=sequence, the British Columbia pill links to /curriculum/british-columbia/grade-3 (view kept only if BC has a sequence; otherwise strands).
- /curriculum/quebec/grade-3 returns 404. Once Alberta is imported (prompt 6), /curriculum/alberta/grade-7 returns 200 before 2027-09-01 and, from 2027-09-01, shows 'Coming soon' for grades 7-8 until new data is loaded (test by passing a date override to current_doc in a unit test).
- An axe accessibility scan of the pill bar shows no violations.
```

## 5. British Columbia + Yukon dataset (NWT flagged for Grades 4-9)

```
Import BC Mathematics K-9 for Grades 1-8 from data/curriculum/bc-yukon-2016.json (294 rows; extracted from https://curriculum.gov.bc.ca/curriculum/mathematics/<grade>/core on 2026-10-17).

Row fields: jurisdiction, applies_to ('BC;YT' or 'BC;YT;NT'), doc_key 'BC-MATH-K9-2016', grade, kind ('content' | 'competency' | 'big_idea'), group (competency group: 'Reasoning and analyzing', 'Understanding and solving', 'Communicating and representing', 'Connecting and reflecting'), seq, code, code_type ('derived'), text (verbatim), elaboration (verbatim, ' || ' between elaboration blocks, may be empty), source_url, last_verified, nt_flag.

Rules:
- BC publishes no alphanumeric codes. Every code here is a Masterasium derived key: BC-MA-G<grade>-C<nn> (content), BC-MA-G<grade>-CC<nn> (curricular competency), BC-MA-G<grade>-BI<n> (big idea). Store code_type = 'derived'. Never display these keys as if BC published them. In the UI show the chip as 'Content 3' / 'Competency 5' / 'Big idea 2' with a small 'Masterasium ref' label, and keep the derived key only in the URL anchor and the admin views.
- Map kind to standard.level: content -> 'content', competency -> 'competency', big_idea -> 'big_idea'.
- Strands for BC: BC does not group content into strands on the official page. Create these derived strands for display only (code_type 'derived'), in this order: 'Big Ideas' (big_idea), 'Content' (content), 'Curricular Competencies' (competency, sub-grouped by group). Do not invent number/geometry strands for BC.
- Store elaboration in standard.extra.elaboration and show it in the chip popover under 'Elaborations (from BC curriculum)'.
- Yukon uses BC's curriculum. Do not duplicate rows. doc_applicability (from prompt 1) already points YT at BC-MATH-K9-2016. The Yukon pages render the same standards with heading 'Yukon follows the British Columbia curriculum.'
- NWT: rows for grades 4-8 carry applies_to including NT and nt_flag text. Keep jurisdiction NT at publish_status 'coming_soon' until its start year is confirmed. Do not publish NT pages from this prompt.
- Alignments: import only BC rows from data/curriculum/grade3-starter-alignments.csv (BC-MA-G3-C01, C02, C03, C05, C09 partial, C10, C12). Leave all other BC content unaligned. They render with 'Practice coming soon'.
- Footer: 'Curriculum: BC Mathematics K-9 (redesigned curriculum). Last verified 2026-10-17.'
- When done, set jurisdiction BC and YT publish_status = 'published'.

Acceptance checks:
- select count(*) per kind for BC-MATH-K9-2016: content 120, competency 134, big_idea 40.
- /curriculum/british-columbia/grade-3 shows 5 big ideas, 14 content items starting with 'number concepts to 1000' and ending with 'financial literacy — fluency with coins and bills to 100 dollars, and earning and payment', and 16 competencies in 4 groups.
- /curriculum/yukon/grade-3 shows the same 14 content items with the 'Yukon follows the British Columbia curriculum.' note.
- No BC chip shows a string starting with 'BC-MA-' in the visible UI.
- /curriculum/northwest-territories/grade-5 still shows 'Coming soon'.
```

## 6. Alberta: new K-6 (Grades 1-6) + legacy Grades 7-8 ending August 2027

```
Import Alberta from two files. Both use derived keys. Alberta's new K-6 curriculum has no published outcome codes, and the 2016 program of studies numbers outcomes only within a strand.

A) data/curriculum/alberta-k6-2022.json (68 rows, Grades 1-6). Extracted 2026-10-17 from LearnAlberta's public curriculum data (https://curriculum.learnalberta.ca/cdn/curriculum/gfc-mat.json, the same data the page https://curriculum.learnalberta.ca/curriculum/en/c/mat<grade> renders).
Fields: grade, strand (organizing idea name: Number, Algebra, Geometry, Coordinate Geometry, Measurement, Patterns, Time, Statistics), organizing_idea (full verbatim), guiding_question, code (derived, e.g. AB-G3-NUM-1), code_type 'derived', source_system_id (LearnAlberta id; may be opaque like 'CLrkTvQMl0Oj1FGsDZHeJQ'), text (learning outcome, verbatim, e.g. 'Students interpret place value to 100 000.'), knowledge, understanding, skills_procedures (verbatim; ' | ' between list items, ' || ' between KUSP blocks), source_last_modified, source_url, source_data_url, last_verified.
- Doc AB-MATH-K6-2022. Strands = organizing ideas, code_type 'derived', ordered as in the file.
- standard.level = 'outcome'. Put guiding_question, knowledge, understanding, skills_procedures, source_last_modified and source_system_id in extra / source_system_id.
- UI: show the outcome text as the item. Show the chip as '<Organizing idea> outcome N' with a 'Masterasium ref' label, never 'AB-G3-NUM-1' and never the LearnAlberta id. The popover shows Guiding question, Knowledge, Understanding, Skills & procedures (bulleted, split on ' | ').
- Important: Alberta has edited several K-6 outcomes since 2022 (source_last_modified runs from 2025-05-30 to 2026-08-17; e.g. Grade 3 fractions and Grade 3 angles have newer ids). Show 'Alberta revised parts of this curriculum; content checked 2026-10-17' in the page footer.

B) data/curriculum/alberta-7-8-legacy-2016.json (42 rows, Grades 7-8). Source: Alberta Mathematics Kindergarten to Grade 9 Program of Studies (2007, updated 2016), https://curriculum.learnalberta.ca/cdn/assets/public/ef066215-6eae-5350-8ba0-f9fe82004ee8/mathematics-7-to-9.pdf.
Fields: grade, strand (Number, Patterns and Relations, Shape and Space, Statistics and Probability), substrand, official_number, code (derived, e.g. AB-G7-N-3), text (verbatim, bullets joined with '; '), processes (e.g. 'C, CN, PS, R, T'), effective_from 2024-09-01 (tracking start), effective_to 2027-08-31, source_url.
- Doc AB-MATH-K9-2016. Chip text: 'Number SO 3' (Alberta's own style, 'SO' = specific outcome) with 'Masterasium ref' label.
- doc_applicability for AB grades 7-8 ends 2027-08-31 (prompt 1). From 2027-09-01 grades 7-8 point at AB-MATH-7-9-NEW, which has no standards, so the grade pills show 'Coming soon' until the new data is imported. LearnAlberta currently lists 'Mathematics (7-9)' (MAT_7-9) as DRAFT with firstSchoolYear 2026. Add a banner on Alberta Grade 7 and 8 pages: 'Alberta is replacing this Grade 7-8 math curriculum. This page follows the 2016 program, in force until August 2027.'

Alignments: import only AB rows from grade3-starter-alignments.csv. Leave the rest unaligned.

When done, set AB publish_status = 'published'.

Acceptance checks:
- Counts: AB-MATH-K6-2022 standards = 68 (G1 8, G2 8, G3 11, G4 13, G5 13, G6 15); AB-MATH-K9-2016 standards = 42 (G7 25, G8 17).
- /curriculum/alberta/grade-3 lists 11 outcomes, first 'Students interpret place value to 100 000.'
- /curriculum/alberta/grade-7 shows the replacement banner and 'Number SO 1'.
- Unit test: with date 2027-09-01, Alberta grade 7 is not published; with date 2027-08-31 it is.
- No visible chip contains 'AB-G' or a LearnAlberta id.

Gaps to leave visible (do not fill): Alberta Kindergarten is not imported (site starts at Grade 1). Grade 9 is not imported. New 7-9 content is not imported because it is still a draft.
```

## 7. Saskatchewan + Manitoba (official codes)

```
Import Saskatchewan and Manitoba. Both use official outcome codes. Show them exactly as published.

A) data/curriculum/saskatchewan.json (125 rows, Grades 1-8). Source pages: https://curriculum.gov.sk.ca/CurriculumOutcomeContent?id=145 (Grade 1) to id=152 (Grade 8). Each row's source_url links to that outcome's own page.
Fields: grade, strand (Number, Patterns and Relations, Shape and Space, Statistics and Probability), code (e.g. N3.1, P3.2, SS3.4, SP3.1), code_type 'official', text (verbatim; list items joined with '; '), processes (e.g. 'C, R, V'), source_url, last_verified, note.
- Doc SK-MATH-1-8. Strands use code_type 'derived' with codes N, P, SS, SP and the names above.
- Show processes as small tags in the popover with a legend: C Communication, CN Connections, ME Mental Mathematics and Estimation, PS Problem Solving, R Reasoning, T Technology, V Visualization.
- Per-grade counts: G1 18, G2 11, G3 12, G4 15, G5 19, G6 19, G7 18, G8 13.

B) data/curriculum/manitoba.json (186 rows, Grades 1-8). Source: https://www.edu.gov.mb.ca/k12/framework/publications/math/outcomes/gr<grade>_outcomes.pdf.
Fields: grade, strand (Number, Patterns and Relations, Shape and Space, Statistics and Probability), code (e.g. 3.N.1, 3.PR.3, 3.SS.5, 3.SP.2), code_type 'official', text (verbatim; sub-bullets joined with '; ' after the first ':'), processes, source_url, last_verified, note.
- Doc MB-MATH-K8-2013. Strands N, PR, SS, SP (derived codes). Grade 1 has no SP outcomes; this is correct.
- Row 2.PR.1 carries a note: the poster prints it as '2.RR.1' (typo). 2.PR.1 is confirmed in https://www.edu.gov.mb.ca/k12/framework/english/math/docs/math_gr2_eng.pdf. Display 2.PR.1.
- Per-grade counts: G1 18, G2 25, G3 25, G4 25, G5 25, G6 26, G7 24, G8 18.
- Sort within a strand by the number after the last dot as an integer (3.N.10 after 3.N.9).

For both provinces:
- Footer: 'Curriculum: <doc title>. Last verified 2026-10-17.'
- Import only the SK and MB rows from grade3-starter-alignments.csv. Leave the rest unaligned ('Practice coming soon').
- When done, set SK and MB publish_status = 'published'.

Acceptance checks:
- Counts match: SK 125, MB 186.
- /curriculum/saskatchewan/grade-3 shows N3.1-N3.4, P3.1-P3.2, SS3.1-SS3.5, SP3.1; the N3.3 popover shows the verbatim note 'It is not intended that students memorize the basic facts.'
- /curriculum/manitoba/grade-3 shows 3.N.1-3.N.13 in numeric order, and 3.N.10 text 'Apply mental math strategies to determine addition facts and related subtraction facts to 18 (9 + 9)'.
- /curriculum/manitoba/grade-2 shows 2.PR.1 (not 2.RR.1).
- All SK/MB chips have code_type 'official' and display the raw code.
```

## 8. Nova Scotia + PEI (official codes); NL, NB and Nunavut on hold

```
Import Nova Scotia and Prince Edward Island. Keep Newfoundland and Labrador, New Brunswick and Nunavut as 'Coming soon'.

A) data/curriculum/nova-scotia-2022.json (173 rows, Grades 1-8). Source: Mathematics <grade> Outcomes (2022), https://curriculum.novascotia.ca/sites/default/files/documents/outcomes-indicators-files/Mathematics%20<grade>%20Outcomes%20%282022%29.pdf.
Fields: grade, strand (Number, Patterns and Relations, Measurement, Geometry, Statistics and Probability), code (N01, PR03, M05, G02, SP01), display_code ('Gr3 N01'), code_type 'official', text (verbatim, begins 'Students will be expected to ...'), source_url, last_verified.
- Doc NS-MATH-2022. Strands N, PR, M, G, SP.
- NS codes repeat across grades, so the unique key is (doc, grade, code). The chip shows the code (N01). Use display_code in admin lists and exports.
- The numbering has deliberate gaps in the 2022 outcomes (e.g. Grade 2 has no N03, Grade 7 SP has 01-04 and 06). Do not renumber and do not create missing codes.
- Per-grade counts: G1 17, G2 23, G3 25, G4 23, G5 24, G6 24, G7 22, G8 15.

B) data/curriculum/pei-2024.json (145 rows, Grades 1-8). Source: https://www.princeedwardisland.ca/sites/default/files/publications/eelc_math_<grade>.pdf (2024 guides).
Fields: grade, strand (Number, Patterns and Relations, Shape and Space, Statistics and Probability), code (3.N1, 3.PR2, 3.SS6, 3.SP1), code_type 'official', text (verbatim), source_url, last_verified, needs_manual_review.
- Doc PE-MATH-2024. Strands N, PR, SS, SP.
- Three rows have needs_manual_review = 'yes' because math symbols were lost in extraction: 7.PR6, 7.SS1, 8.PR2. Set standard.needs_review = true for them. Hide them from public pages until an admin pastes the exact wording from the PDF, records the PDF page in extra.manual_text_source, and clears needs_review. Show 'Being checked' in their place.
- Per-grade counts: G1 14, G2 21, G3 21, G4 21, G5 19, G6 18, G7 19, G8 12.

On hold (no data import in this prompt):
- Newfoundland and Labrador: new K-2 math is rolling out and Grades 3-8 guides are pending replacement. Keep 'coming_soon'.
- New Brunswick (anglophone): keep 'coming_soon' until the official grade documents are confirmed.
- Nunavut: deferred. Grades 1-3 follow Nunavut's own curriculum and 4-8 follow Alberta's legacy program (already modelled in doc_applicability). Keep 'coming_soon'.
On those pages, show visible text: '<Province> is coming soon. We publish a province only after checking its current official curriculum.'

For both NS and PE: import only their rows from grade3-starter-alignments.csv, add the 'Last verified 2026-10-17' footer, then set NS and PE publish_status = 'published'.

Acceptance checks:
- Counts: NS 173, PE 145.
- /curriculum/nova-scotia/grade-3 shows N01-N13, PR01-PR03, M01-M05, G01-G02, SP01-SP02.
- /curriculum/prince-edward-island/grade-8 does not show 8.PR2 text and shows 'Being checked' in its place.
- NL, NB and NU pills show 'Coming soon', and their routes return 404 for every grade.
```

## 9. QA: automated curriculum integrity checks

```
Add an automated QA suite (Vitest + a SQL check script) that runs in CI on every PR and nightly. Fail the build on any error.

Create tests/curriculum/integrity.test.ts and supabase/tests/curriculum_checks.sql with these checks:

1. Every published skill links to at least one standard:
   select s.slug from skill s left join alignment a on a.skill_id=s.id where a.skill_id is null  -> must return 0 rows for skills shown on any published page.
2. Every standard has a source: standard.source_url is not null, starts with 'https://', and its host is one of: www.dcp.edu.gov.on.ca, assets-us-01.kc-usercontent.com, curriculum.gov.bc.ca, curriculum.learnalberta.ca, curriculum.gov.sk.ca, www.edu.gov.mb.ca, curriculum.novascotia.ca, www.princeedwardisland.ca. Any other host fails.
3. No derived code is shown as official:
   - DB: code_type='official' only for docs ON-MATH-2020, SK-MATH-1-8, MB-MATH-K8-2013, NS-MATH-2022, PE-MATH-2024. Any 'official' row in BC or AB docs fails.
   - Format: ON official codes match ^[A-F][0-9](\.[0-9]{1,2})?$ ; SK ^(N|P|SS|SP)[1-8]\.[0-9]{1,2}$ ; MB ^[1-8]\.(N|PR|SS|SP)\.[0-9]{1,2}$ ; NS ^(N|PR|M|G|SP)[0-9]{2}$ ; PE ^[1-8]\.(N|PR|SS|SP)[0-9]{1,2}$ .
   - Rendered HTML (Playwright, every published grade page): no visible text matches ^BC-MA-|^AB-G[0-9]|source_system_id values. Every chip for a derived standard carries data-code-type="derived" and shows the 'Masterasium ref' label.
4. Grade placements match the source files: for each data/curriculum/*.json, every (grade, code) in the file exists in standard with the same grade and text (exact string match), and the DB has no extra rows for that doc. The one exception: a PE row whose needs_review was cleared by an admin may differ from the file if extra.manual_text_source is set. Expected counts: ON specific 369 (+8 A1), BC 294, AB K-6 68, AB 7-8 42, SK 125, MB 186, NS 173, PE 145.
5. Ontario placement regressions (from the 2026 corrections):
   - No Grade 3 skill aligned to Grade 4 B2.2 or titled with '10×10' recall; Grade 4 has a skill aligned to Grade 4 B2.2.
   - No Grade 3 skill title contains 'remainder'.
   - No Grade 4 skill aligned to fraction addition (Grade 5 B2.5).
   - No Grade 5 skill title contains 'Volume'.
   - Each Ontario grade page renders strand headings A-F in order.
6. Sequence integrity: every published sequence covers every specific expectation of its grade at least once; positions are 1..N with no gaps; the page shows the visible text 'Suggested by Masterasium'.
7. 'Last verified' on every page: Playwright visits every published /curriculum/<slug>/grade-<n> and asserts a footer element [data-testid="last-verified"] whose text matches /Last verified \d{4}-\d{2}-\d{2}/ and equals curriculum_doc.last_verified for the doc in force. It warns (does not fail) if the date is older than 365 days.
8. Effective dates: unit-test current_doc for ('AB',7,'2027-08-31') -> AB-MATH-K9-2016, ('AB',7,'2027-09-01') -> AB-MATH-7-9-NEW, ('YT',5,today) -> BC-MATH-K9-2016, and no overlapping doc_applicability ranges anywhere.
9. Review flags: no standard with needs_review = true renders its text on a public page.
10. Pills: snapshot test that the selected pill has background-color rgb(211, 235, 247) and a 2px border, that each coming-soon pill contains the visible text 'Coming soon', and that there is no Quebec pill.

Output: print a summary table (check, status, count of failures, first 5 offending ids) and write it to qa-report.md as a CI artifact.

Acceptance check: run the suite on main after prompts 1-8. It passes. Then deliberately set one BC standard to code_type 'official' and confirm checks 3 and 4 fail with that row's id.
```
