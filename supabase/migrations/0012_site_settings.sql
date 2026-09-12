-- Site-wide settings: logo, header style, colors, fonts, social
-- links, and contact info. Single-row table — id is a boolean fixed
-- to `true`, and the check constraint below rules out any other
-- value, so there can only ever be exactly one row. Public-readable
-- since the live site needs it on every page render (logo, header
-- style, colors); writes always go through the service-role client
-- from /admin, same as the pages table.
create table public.site_settings (
  id boolean primary key default true,
  logo_url text,
  favicon_url text,
  header_style text not null default 'solid' check (header_style in ('solid', 'image')),
  header_image_url text,
  header_overlay_theme text not null default 'light' check (header_overlay_theme in ('light', 'dark')),
  accent_color text not null default '#c4a672',
  ink_color text not null default '#40382e',
  heading_font text not null default 'playfair' check (heading_font in ('playfair', 'cormorant', 'marcellus')),
  body_font text not null default 'jost' check (body_font in ('jost', 'karla', 'lato')),
  instagram_url text,
  facebook_url text,
  pinterest_url text,
  tiktok_url text,
  contact_phone text,
  contact_email text,
  contact_address text,
  updated_at timestamptz not null default now(),
  constraint site_settings_single_row check (id)
);

alter table public.site_settings enable row level security;

create policy "Anyone can view site settings"
  on public.site_settings for select
  using (true);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- Seed the one row with the social links that were previously
-- hardcoded in components/site/SocialLinks.tsx, so switching that
-- component over to settings-driven links is a no-op on first deploy.
insert into public.site_settings (id, instagram_url, facebook_url)
values (true, 'https://instagram.com/wildjunecreative', 'https://facebook.com/wildjunecreative')
on conflict (id) do nothing;

-- Public bucket for branding assets (logo, favicon, header image).
-- Unlike the private `galleries` bucket, these need to be readable by
-- every visitor on every page load without a signed URL, so the
-- bucket itself is public rather than gated by a storage.objects
-- policy.
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;
