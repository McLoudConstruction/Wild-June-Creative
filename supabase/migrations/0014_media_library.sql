-- A flat, public bucket of standalone photos for use in page content
-- (block images, background images) — separate from the private
-- `galleries` bucket, which holds client session photos under access
-- control and an expiration policy. Photos end up here two ways:
-- a direct upload from Admin > Pages' image picker, or a copy made
-- when Isabelle picks an existing gallery photo to reuse on the
-- website (see lib/admin/media-actions.ts) — copied rather than
-- linked, so website content doesn't silently break or need
-- re-picking if the source gallery later expires or gets deleted.
insert into storage.buckets (id, name, public)
values ('media-library', 'media-library', true)
on conflict (id) do nothing;
