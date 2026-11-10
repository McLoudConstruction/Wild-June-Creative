import type { SectionAppearance } from '@/lib/site/blocks';
import type { CSSProperties } from 'react';

// Computes the section's own background — the wrapping <section> in
// each block spreads this onto its style prop. Image backgrounds get
// a soft scrim so text stays legible regardless of what's in the
// photo, tuned for whichever text theme is active.
export function sectionBackgroundStyle(appearance: SectionAppearance): CSSProperties {
  if (appearance.background === 'color' && appearance.backgroundColor) {
    return { background: appearance.backgroundColor };
  }

  if (appearance.background === 'image' && appearance.backgroundImage) {
    const scrim =
      appearance.textTheme === 'light' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)';
    return {
      backgroundImage: `linear-gradient(${scrim}, ${scrim}), url(${appearance.backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }

  return {};
}

// Font-size override for one text element, spread onto its style prop
// AFTER the element's default fontSize so it wins. Returns {} when no
// override is set. Larger sizes (headings) scale down on narrow
// screens — full size from tablet width up, shrinking to 60% on
// phones — so a big desktop heading can't overflow a small screen.
export function fontSizeStyle(appearance: SectionAppearance, key: string): CSSProperties {
  const size = appearance.fontSizes?.[key];
  if (typeof size !== 'number' || !Number.isFinite(size) || size <= 0) return {};
  if (size <= 24) return { fontSize: `${size}px` };
  const min = Math.round(size * 0.6);
  return { fontSize: `clamp(${min}px, ${(size / 7.68).toFixed(3)}vw, ${size}px)` };
}

// Heading/body colors to match the section's text theme. Dark theme
// is the site's normal palette (ink headings, warm-gray body); light
// theme swaps in near-white so text reads on a dark or photo
// background.
export function sectionTextColors(appearance: SectionAppearance): {
  heading: string;
  body: string;
} {
  if (appearance.textTheme === 'light') {
    return { heading: '#ffffff', body: 'rgba(255,255,255,0.82)' };
  }
  return { heading: 'var(--ink)', body: 'var(--warm-gray)' };
}
