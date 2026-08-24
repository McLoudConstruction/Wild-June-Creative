-- Photos now get two versions on upload: a compressed display version
-- (storage_path, ~2400px) and a small thumbnail (thumbnail_path,
-- ~500px) specifically for grid views, so browsing a gallery doesn't
-- mean downloading full-size images just to show them tiny.
alter table public.photos add column thumbnail_path text;
