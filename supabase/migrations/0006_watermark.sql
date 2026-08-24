-- Single-row settings table for the watermark image + how it's
-- applied. Using a fixed, known id rather than letting one get
-- generated keeps "fetch current settings" and "update settings" both
-- simple upserts against the same row, with no need to look anything
-- up first.
create table public.watermark_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001',
  storage_path text,
  position text not null default 'bottom-right', -- top-left | top-right | bottom-left | bottom-right | center
  opacity_percent integer not null default 60,
  width_percent integer not null default 20, -- watermark width, relative to the photo's width
  updated_at timestamptz not null default now()
);

alter table public.watermark_settings enable row level security;
-- No client-facing policy — this is admin/server-only, read and
-- written via the service_role key when processing uploads.

-- Tracks whether a given photo actually has the watermark baked in,
-- so the admin gallery view can show which photos are protected and
-- which aren't (upload-time toggle means it can vary photo to photo).
alter table public.photos add column is_watermarked boolean not null default false;
