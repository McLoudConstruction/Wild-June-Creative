-- Who is allowed into /admin. Logins themselves live in Supabase Auth
-- (same system the client portal uses: password hashing, sessions,
-- forgot-password emails); this table is just the list of which auth
-- users count as admins. A client with a portal login is NOT an admin
-- unless a row for them exists here.
--
-- Replaces the shared Basic Auth credentials that used to live in
-- Vercel env vars (ADMIN_USERNAME / ADMIN_PASSWORD, ...). Those keep
-- working as a fallback until the env vars are deleted.
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- A signed-in admin can read their own row — that's all the
-- middleware's "is this session an admin?" check needs, and it runs
-- with the anon key + the visitor's session, so RLS is what keeps a
-- client from reading the admin list. No insert/update/delete
-- policies: every write goes through the service-role client in
-- lib/admin/admin-users-actions.ts, so nobody can grant themselves
-- admin from the browser.
create policy "admins can read their own row"
  on public.admin_users
  for select
  using (auth.uid() = auth_user_id);

-- ---------------------------------------------------------------
-- FIRST ADMIN (run once, after this migration):
--
-- 1. Supabase dashboard → Authentication → Users → Add user →
--    "Create new user". Enter your email + a password, and tick
--    "Auto Confirm User".
-- 2. Run this in the SQL editor, with your email filled in:
--
--    insert into public.admin_users (auth_user_id, email)
--    select id, email from auth.users
--    where email = 'you@example.com';
--
-- Every admin after that is added from Settings → Admins in the
-- dashboard.
-- ---------------------------------------------------------------
