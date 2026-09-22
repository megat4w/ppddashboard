-- =========================================================
-- SPM Dashboard — Supabase schema & Row Level Security
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =========================================================

-- 1. The table that stores every shortcut card.
--    Branch/department are stored as plain text since the 20
--    department names are fixed and defined in the frontend,
--    not user-editable — no separate departments table needed.
create table if not exists public.resources (
  id               uuid primary key default gen_random_uuid(),
  branch           text not null check (branch in ('HEM', 'Bakat Murid')),
  department       text not null,
  title            text not null,
  link             text not null,
  year             int,
  uploaded_by      text,          -- display name, auto-filled from Google account
  uploaded_by_email text,         -- for auditing, not shown in UI
  created_at       timestamptz not null default now(),
  last_edited_by   text,
  last_edited_at   timestamptz
);

-- Helpful index since every dashboard view filters by branch+department
create index if not exists resources_branch_department_idx
  on public.resources (branch, department);

-- 2. Turn on Row Level Security — nothing is accessible until
--    a policy explicitly allows it.
alter table public.resources enable row level security;

-- 3. Only signed-in accounts whose email ends in @moe.gov.my
--    may read or write. This is enforced by Postgres itself,
--    not just hidden in the frontend — so even if someone
--    inspects the page and calls Supabase directly, they're
--    still blocked at the database level.
create policy "moe staff can view resources"
  on public.resources for select
  using ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

create policy "moe staff can add resources"
  on public.resources for insert
  with check ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

create policy "moe staff can edit resources"
  on public.resources for update
  using ( (auth.jwt() ->> 'email') like '%@moe.gov.my' )
  with check ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

create policy "moe staff can delete resources"
  on public.resources for delete
  using ( (auth.jwt() ->> 'email') like '%@moe.gov.my' );

-- =========================================================
-- One-time setup you still need to do in the Supabase dashboard
-- (this file only covers the database side):
--
-- 1. Authentication → Sign In / Providers → Google
--    - Turn Google on.
--    - You'll need a Google Cloud OAuth Client ID (Web application
--      type) from https://console.cloud.google.com/apis/credentials
--    - Add your Google Site's embed origin to the OAuth client's
--      "Authorized JavaScript origins".
--
-- 2. Authentication → URL Configuration
--    - Add the URL your embedded app will run from.
--
-- 3. Copy your Project URL and anon public API key from
--    Project Settings → API — you'll need both in index.html.
-- =========================================================
