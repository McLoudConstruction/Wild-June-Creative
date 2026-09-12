import Link from 'next/link';
import Image from 'next/image';
import { LogOut } from 'lucide-react';
import { NAV_LINKS } from '@/lib/site/nav';
import { SocialLinks } from './SocialLinks';
import { HeaderLayout } from './HeaderLayout';
import { createClient } from '@/lib/supabase/server';
import { getSiteSettings } from '@/lib/site/settings';
import { signOutAction } from '@/lib/portal/actions';

// An async Server Component — it checks the visitor's Supabase session
// on every render so the nav can swap "Client Login" for "Your Portal"
// (plus a Log out link) the moment someone's signed in, on every page
// that renders this header (home, portal, login). Because it reads
// cookies() via lib/supabase/server, it can only be rendered from
// Server Components — never imported into a 'use client' file. (That's
// why /login's interactive form lives in its own LoginForm client
// component instead of in app/login/page.tsx directly.)
//
// Header style, logo, and logo position are controlled from
// Admin > Pages (logo position, live) and Admin > Settings > Branding
// (everything else) — see lib/site/settings.ts. The actual
// left/center/right arrangement logic lives in HeaderLayout, shared
// with the editor's live preview.
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const settings = await getSiteSettings();

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
      priority
      style={{ height: 'auto', width: '190px' }}
    />
  );

  const logo = (
    <Link href="/" aria-label="Wild June Creative home">
      {logoImg}
    </Link>
  );

  const trailingItems = (
    <>
      <li>
        {user ? (
          <Link href="/portal" className="nav-link" style={{ color: navTextColor }}>
            Your Portal
          </Link>
        ) : (
          <Link href="/login" className="nav-link" style={{ color: navTextColor }}>
            Client Login
          </Link>
        )}
      </li>
      {user && (
        <li>
          <form action={signOutAction} style={{ margin: 0, display: 'flex' }}>
            <button
              type="submit"
              aria-label="Log out"
              title="Log out"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                color: navTextColor,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LogOut size={18} />
            </button>
          </form>
        </li>
      )}
    </>
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
        logoPosition={settings.logo_position}
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
