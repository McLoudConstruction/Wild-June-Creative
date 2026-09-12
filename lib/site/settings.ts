import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export type HeadingFont = 'playfair' | 'cormorant' | 'marcellus';
export type BodyFont = 'jost' | 'karla' | 'lato';

export type SiteSettings = {
  logo_url: string | null;
  favicon_url: string | null;
  header_style: 'solid' | 'image';
  header_image_url: string | null;
  header_overlay_theme: 'light' | 'dark';
  accent_color: string;
  ink_color: string;
  heading_font: HeadingFont;
  body_font: BodyFont;
  instagram_url: string | null;
  facebook_url: string | null;
  pinterest_url: string | null;
  tiktok_url: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  logo_url: null,
  favicon_url: null,
  header_style: 'solid',
  header_image_url: null,
  header_overlay_theme: 'light',
  accent_color: '#c4a672',
  ink_color: '#40382e',
  heading_font: 'playfair',
  body_font: 'jost',
  instagram_url: null,
  facebook_url: null,
  pinterest_url: null,
  tiktok_url: null,
  contact_phone: null,
  contact_email: null,
  contact_address: null,
};

// A handful of pre-loaded pairings rather than an arbitrary font
// picker — next/font loads Google Fonts at build time, so the choices
// have to be known ahead of time rather than typed in freely. All six
// are loaded in app/layout.tsx; picking one here just swaps which
// CSS variable --font-serif / --font-sans points at.
export const HEADING_FONT_OPTIONS: { value: HeadingFont; label: string }[] = [
  { value: 'playfair', label: 'Playfair Display (current)' },
  { value: 'cormorant', label: 'Cormorant Garamond' },
  { value: 'marcellus', label: 'Marcellus' },
];

export const BODY_FONT_OPTIONS: { value: BodyFont; label: string }[] = [
  { value: 'jost', label: 'Jost (current)' },
  { value: 'karla', label: 'Karla' },
  { value: 'lato', label: 'Lato' },
];

// Wrapped in React's cache() so the root layout, Header, Footer, and
// homepage — all of which need this on every request — share a
// single DB round trip instead of four. Only valid in Server
// Components (it calls the cookie-based Supabase client).
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle();

  if (!data) {
    return DEFAULT_SITE_SETTINGS;
  }

  return { ...DEFAULT_SITE_SETTINGS, ...data };
});
