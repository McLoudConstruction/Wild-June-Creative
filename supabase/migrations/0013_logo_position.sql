-- Where the logo sits in the header — controlled live from the
-- fullscreen page editor (Admin > Pages > open a page), not the
-- Branding settings form, since seeing the layout update in real
-- time next to the actual page content is the point.
alter table public.site_settings
  add column logo_position text not null default 'left'
  check (logo_position in ('left', 'center', 'right'));
