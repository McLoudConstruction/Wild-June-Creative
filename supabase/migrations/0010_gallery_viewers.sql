-- Lets more than one client view the same gallery — e.g. a
-- grandparent or co-parent who should see a family session but isn't
-- the client tied to the booking/payments. The gallery still has
-- exactly one owning client_id (unchanged) for billing and the
-- existing "your galleries" list on /portal; this table adds
-- *additional* read access on top of that, granted/revoked by the
-- admin from the gallery's Manage tab.
--
-- Run manually in the Supabase SQL Editor, like every other migration
-- in this project — this isn't applied automatically on deploy.
create table public.gallery_viewers (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (gallery_id, client_id)
);

alter table public.gallery_viewers enable row level security;
-- No client-facing policy on this table — viewers are granted/revoked
-- only by the admin tool, via the service_role key, which bypasses
-- RLS entirely. A client never reads or writes this table directly.

-- Postgres combines multiple *permissive* policies on the same table
-- with OR, so these add to — rather than replace — the existing
-- "owner" policies from 0001_init.sql. A gallery or photo is visible
-- if the logged-in client either owns it (existing policy) OR has
-- been granted viewer access (these new ones).
create policy "Viewers can view galleries they've been granted access to"
  on public.galleries for select
  using (
    id in (
      select gv.gallery_id from public.gallery_viewers gv
      join public.clients c on c.id = gv.client_id
      where c.auth_user_id = auth.uid()
    )
  );

create policy "Viewers can view photos in galleries they've been granted access to"
  on public.photos for select
  using (
    gallery_id in (
      select gv.gallery_id from public.gallery_viewers gv
      join public.clients c on c.id = gv.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- Viewers can favorite photos too, same as the owning client can —
-- there's no reason a grandparent looking through the gallery
-- shouldn't be able to mark their own favorites.
create policy "Viewers can favorite photos in galleries they've been granted access to"
  on public.photos for update
  using (
    gallery_id in (
      select gv.gallery_id from public.gallery_viewers gv
      join public.clients c on c.id = gv.client_id
      where c.auth_user_id = auth.uid()
    )
  )
  with check (
    gallery_id in (
      select gv.gallery_id from public.gallery_viewers gv
      join public.clients c on c.id = gv.client_id
      where c.auth_user_id = auth.uid()
    )
  );
