-- Allow every elementary grade on an existing database.
-- Fresh installs already get this check from 001_init.sql.
-- Paste these statements into the Supabase SQL editor:

alter table public.children drop constraint if exists children_grade_check;
alter table public.children add constraint children_grade_check check (grade between 1 and 8);
