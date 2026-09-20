export type NavLink = { label: string; href: string };

// Fallback only — used when site_settings.nav_links is missing (a
// fresh local Supabase project before migrations have seeded it). The
// real, editable nav lives in site_settings.nav_links now, managed
// from /admin/pages.
export const DEFAULT_NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/#packages', label: 'Sessions' },
  { href: '/#about', label: 'About' },
  { href: '/book', label: 'Book' },
];
