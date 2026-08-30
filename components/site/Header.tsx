import Image from 'next/image';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/site/nav';
import { SocialLinks } from './SocialLinks';
import { createClient } from '@/lib/supabase/server';
import { signOutAction } from '@/lib/portal/actions';

// An async Server Component — it checks the visitor's Supabase session
// on every render so the nav can swap "Client Login" for "Your Portal"
// (plus a Log out link) the moment someone's signed in, on every page
// that renders this header (home, portal, login). Because it reads
// cookies() via lib/supabase/server, it can only be rendered from
// Server Components — never imported into a 'use client' file. (That's
// why /login's interactive form lives in its own LoginForm client
// component instead of in app/login/page.tsx directly.)
export async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header>
      <div className="container header-row">
        <Link href="/" aria-label="Wild June Creative home">
          <Image
            src="/brand/wordmark-dark.png"
            alt="Wild June Creative"
            width={1593}
            height={483}
            priority
            style={{ height: 'auto', width: '190px' }}
          />
        </Link>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <ul className="nav-list">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="nav-link">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              {user ? (
                <Link href="/portal" className="nav-link">
                  Your Portal
                </Link>
              ) : (
                <Link href="/login" className="nav-link">
                  Client Login
                </Link>
              )}
            </li>
            {user && (
              <li>
                <form action={signOutAction} style={{ margin: 0 }}>
                  <button
                    type="submit"
                    className="nav-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      cursor: 'pointer',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    Log out
                  </button>
                </form>
              </li>
            )}
          </ul>
          <SocialLinks color="var(--ink)" />
        </nav>
      </div>
    </header>
  );
}
