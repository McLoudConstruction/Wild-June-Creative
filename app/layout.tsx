import type { Metadata } from 'next';
import {
  Playfair_Display,
  Cormorant_Garamond,
  Marcellus,
  Jost,
  Karla,
  Lato,
  Alex_Brush,
} from 'next/font/google';
import { getSiteSettings } from '@/lib/site/settings';
import './globals.css';

// A curated set of heading/body pairings, all loaded up front — see
// lib/site/settings.ts for why (next/font needs known-at-build-time
// imports, so the "picker" in Admin > Settings just chooses which of
// these already-loaded fonts --font-serif / --font-sans point at,
// rather than loading fonts on demand).
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-heading-playfair', display: 'swap' });
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-heading-cormorant',
  display: 'swap',
});
const marcellus = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-heading-marcellus', display: 'swap' });

const jost = Jost({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-body-jost', display: 'swap' });
const karla = Karla({ subsets: ['latin'], weight: ['300', '400', '500'], variable: '--font-body-karla', display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['300', '400'], variable: '--font-body-lato', display: 'swap' });

const script = Alex_Brush({ subsets: ['latin'], weight: '400', variable: '--font-script', display: 'swap' });

const ALL_FONT_VARIABLES = [
  playfair.variable,
  cormorant.variable,
  marcellus.variable,
  jost.variable,
  karla.variable,
  lato.variable,
  script.variable,
].join(' ');

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  return {
    title: 'Wild June Creative | Kansas City Photography',
    description:
      'Personal and business photography around the Kansas City area. Family sessions, portraits, and small business photography by Wild June Creative.',
    icons: settings.favicon_url ? { icon: settings.favicon_url } : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();

  // Inline custom properties on <html> beat the :root declarations in
  // globals.css (same element, higher specificity), so this is enough
  // to re-theme the whole site from Admin > Settings without touching
  // any component's own styles.
  const themeStyle = {
    '--font-serif': `var(--font-heading-${settings.heading_font})`,
    '--font-sans': `var(--font-body-${settings.body_font})`,
    '--accent': settings.accent_color,
    '--ink': settings.ink_color,
  } as React.CSSProperties;

  return (
    <html lang="en" className={ALL_FONT_VARIABLES} style={themeStyle}>
      <body>{children}</body>
    </html>
  );
}
