-- Header/footer navigation becomes editable from /admin/pages: an
-- ordered array of { label, href } objects, independent of which
-- pages exist — a link can point to a page, an anchor on the
-- homepage ("/#packages"), or an external URL. Seeded with the nav
-- exactly as it exists today (previously the hardcoded NAV_LINKS
-- constant in lib/site/nav.ts), so this ships as a visual no-op.
alter table public.site_settings
  add column nav_links jsonb not null default '[
    {"label": "Home", "href": "/"},
    {"label": "Sessions", "href": "/#packages"},
    {"label": "About", "href": "/#about"},
    {"label": "Book", "href": "/book"}
  ]'::jsonb;
