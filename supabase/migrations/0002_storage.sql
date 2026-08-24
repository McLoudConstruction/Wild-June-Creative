-- Storage bucket for gallery photos. Private by default — access is
-- only granted through signed URLs generated server-side, or via the
-- policies below for the authenticated client who owns the gallery.

insert into storage.buckets (id, name, public)
values ('galleries', 'galleries', false)
on conflict (id) do nothing;

-- Storage paths are structured as: {gallery_id}/{filename}
-- so we can match the folder name against galleries the client owns.

create policy "Clients can read photos in their own galleries"
  on storage.objects for select
  using (
    bucket_id = 'galleries'
    and (storage.foldername(name))[1]::uuid in (
      select g.id from public.galleries g
      join public.clients c on c.id = g.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- Uploads/deletes happen server-side via service_role (admin uploading
-- a client's gallery after a shoot), so no client-facing insert/delete
-- policy is defined here on purpose.
