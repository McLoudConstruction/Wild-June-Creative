'use client';

import Link from 'next/link';
import Image from 'next/image';
import { NAV_LINKS } from '@/lib/site/nav';
import { HeaderLayout } from './HeaderLayout';
import { SocialLinks } from './SocialLinks';
import type { SiteSettings } from '@/lib/site/settings';

// Mirrors Header.tsx's rendering, minus the real auth check (a design
// preview doesn't need to know if a real visitor is logged in — it
// always shows the logged-out "Client Login" state) so it can be a
// plain client component driven by the logoPosition the admin is
// currently trying out, before it's even saved.
export function HeaderPreviewClient({
  settings,
  logoPosition,
}: {
  settings: SiteSettings;
  logoPosition: 'left' | 'center' | 'right';
}) {
  const isImageHeader = settings.header_style === 'image' && Boolean(settings.header_image_url);
  const navTextColor = isImageHeader
    ? settings.header_overlay_theme === 'light'
      ? '#ffffff'
      : 'var(--ink)'
    : 'var(--ink)';

  const logoImg = settings.logo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={settings.logo_url}
      alt="Wild June Creative"
      style={{ height: 'auto', width: '190px', display: 'block' }}
    />
  ) : (
    <Image
      src="/brand/wordmark-dark.png"
      alt="Wild June Creative"
      width={1593}
      height={483}
      style={{ height: 'auto', width: '190px' }}
    />
  );

  const logo = (
    <Link href="/" aria-label="Wild June Creative home">
      {logoImg}
    </Link>
  );

  const trailingItems = (
    <li>
      <Link href="/login" className="nav-link" style={{ color: navTextColor }}>
        Client Login
      </Link>
    </li>
  );

  return (
    <header
      style={
        isImageHeader
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.18), rgba(0,0,0,0.18)), url(${settings.header_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              minHeight: '62vh',
              display: 'flex',
              alignItems: 'flex-start',
            }
          : undefined
      }
    >
      <HeaderLayout
        logoPosition={logoPosition}
        logo={logo}
        navLinks={NAV_LINKS}
        navTextColor={navTextColor}
        trailingItems={trailingItems}
        social={
          <SocialLinks
            color={navTextColor}
            instagramUrl={settings.instagram_url}
            facebookUrl={settings.facebook_url}
            pinterestUrl={settings.pinterest_url}
            tiktokUrl={settings.tiktok_url}
          />
        }
      />
    </header>
  );
}
