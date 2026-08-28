-- Photo folders ("albums") let an admin split one gallery into named
-- groups — e.g. "Ceremony", "Reception - Family Photos", "Reception -
-- Dancing" — so a client isn't stuck browsing (or zip-downloading)
-- 400 photos as one undifferentiated pile.
--
-- Folders are scoped to a single gallery (not shared across clients),
-- matching how storage paths and RLS are already scoped per-gallery
-- everywhere else in this schema.
create table public.photo_folders (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.photo_folders enable row level security;

create policy "Clients can view folders in their own galleries"
  on public.photo_folders for select
  using (
    gallery_id in (
      select g.id from public.galleries g
      join public.clients c on c.id = g.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- No client insert/update/delete policy — folders are an admin-only
-- concept, managed via service_role, same as photo uploads.

-- A photo with folder_id = null is simply unsorted — it still shows
-- up in the gallery, just outside any named album. Deleting a folder
-- (on delete set null) un-sorts its photos rather than deleting them,
-- since a folder is an organizational label, not a container the
-- photos actually live inside.
alter table public.photos add column folder_id uuid references public.photo_folders(id) on delete set null;
