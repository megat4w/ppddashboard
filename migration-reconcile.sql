-- =========================================================
-- SPM Dashboard — reconcile existing table to final design
-- Safe to run multiple times.
-- =========================================================

-- Add audit-trail columns if they're not already there
alter table public.resources
  add column if not exists last_edited_by text,
  add column if not exists last_edited_at timestamptz;

-- Drop any old/duplicate policies by name, then recreate cleanly.
-- (DROP POLICY IF EXISTS is safe even if the name never existed.)
drop policy if exists "Public read access"          on public.resources;
drop policy if exists "moe staff can view resources" on public.resources;
drop policy if exists "moe staff can add resources"  on public.resources;
drop policy if exists "moe staff can edit resources" on public.resources;
drop policy if exists "moe staff can delete resources" on public.resources;
drop policy if exists "MOE staff can insert"         on public.resources;
drop policy if exists "MOE staff can update"         on public.resources;
drop policy if exists "MOE staff can delete"         on public.resources;

create policy "moe staff can view resources"
  on public.resources for select
  to authenticated
  using ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

create policy "moe staff can add resources"
  on public.resources for insert
  to authenticated
  with check ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

create policy "moe staff can edit resources"
  on public.resources for update
  to authenticated
  using ( (auth.jwt() ->> 'email') like '%@moe.gov.my' )
  with check ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

create policy "moe staff can delete resources"
  on public.resources for delete
  to authenticated
  using ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

-- Sanity check: list every policy currently on the table
select policyname, cmd, roles from pg_policies where tablename = 'resources';
