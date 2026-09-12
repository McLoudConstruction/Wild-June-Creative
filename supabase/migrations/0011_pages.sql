-- Pages table backs the block-based page builder: each row is one
-- public page, and `blocks` is an ordered JSON array of
-- { id, type, props } objects rendered by BlockRenderer. Admin writes
-- always go through the service-role client (lib/supabase/admin.ts)
-- since /admin uses Basic Auth, not a Supabase auth session — there's
-- no "authenticated" role here to grant write policies to.
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  blocks jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pages enable row level security;

create policy "Anyone can view published pages"
  on public.pages for select
  using (published = true);

create trigger pages_set_updated_at
  before update on public.pages
  for each row execute function public.set_updated_at();

-- Seed the homepage with its current content as blocks, so switching
-- app/page.tsx over to the block renderer is visually a no-op on
-- first deploy — nothing changes until Isabelle edits something in
-- /admin/pages.
insert into public.pages (slug, title, blocks, published)
values (
  'home',
  'Home',
  '[
    {
      "id": "hero-1",
      "type": "hero",
      "props": {
        "background": "none",
        "backgroundColor": "#f2f2f2",
        "backgroundImage": "",
        "textTheme": "dark",
        "heading": "The kind of photos you''ll actually put on the wall.",
        "script": "gently, honestly, in wildflower light",
        "body": "Family sessions, portraits, and small business photography around the Kansas City area. Unhurried, true to how you actually look and live, delivered in a private gallery you''ll want to revisit.",
        "primaryLabel": "Book a session",
        "primaryHref": "/book",
        "secondaryLabel": "See what''s included",
        "secondaryHref": "#sessions"
      }
    },
    {
      "id": "featured-photo-1",
      "type": "featured_photo",
      "props": {
        "imageSrc": "",
        "href": "/book",
        "aspectRatio": "21 / 9",
        "label": "Add Isabelle''s favorite hero photo here — wide, landscape orientation works best"
      }
    },
    {
      "id": "sessions-1",
      "type": "sessions",
      "props": {
        "background": "color",
        "backgroundColor": "#f2f2f2",
        "backgroundImage": "",
        "textTheme": "dark",
        "heading": "Sessions",
        "body": "A few starting points. Every session includes a private online gallery, with the option to pay in full or in installments."
      }
    },
    {
      "id": "portfolio-1",
      "type": "portfolio_grid",
      "props": {
        "background": "none",
        "backgroundColor": "#f2f2f2",
        "backgroundImage": "",
        "textTheme": "dark",
        "heading": "A few favorites",
        "body": "A small preview — the full portfolio is coming soon.",
        "items": [
          { "imageSrc": "", "aspectRatio": "3 / 4" },
          { "imageSrc": "", "aspectRatio": "1 / 1" },
          { "imageSrc": "", "aspectRatio": "4 / 5" },
          { "imageSrc": "", "aspectRatio": "4 / 5" },
          { "imageSrc": "", "aspectRatio": "1 / 1" },
          { "imageSrc": "", "aspectRatio": "3 / 4" }
        ]
      }
    },
    {
      "id": "about-1",
      "type": "about",
      "props": {
        "background": "none",
        "backgroundColor": "#f2f2f2",
        "backgroundImage": "",
        "textTheme": "dark",
        "heading": "Hi, I''m Isabelle",
        "body": "I started Wild June Creative because I love the ordinary parts of a family''s life just as much as the milestones. Around the Kansas City area, I photograph people the way they actually are — unposed, unhurried, and a little wild around the edges.",
        "imageSrc": "",
        "buttonLabel": "Let''s work together",
        "buttonHref": "/book"
      }
    }
  ]'::jsonb,
  true
)
on conflict (slug) do nothing;
