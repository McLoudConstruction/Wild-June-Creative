import Image from 'next/image';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/site/nav';
import { SocialLinks } from './SocialLinks';

export function Footer() {
  return (
    <footer style={{ background: 'var(--ink)', padding: '64px 32px 32px' }}>
      <div
        className="container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          textAlign: 'center',
        }}
      >
        <Image
          src="/brand/wjc-logo-square-white.png"
          alt="Wild June Creative"
          width={300}
          height={300}
          style={{ width: '76px', height: 'auto' }}
        />

        <div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--cream)', marginBottom: 8 }}>
            Follow along
          </h2>
          <p style={{ color: 'var(--taupe)', fontSize: 14, margin: 0 }}>
            New sessions and behind the scenes, mostly on Instagram.
          </p>
        </div>

        <SocialLinks color="var(--cream)" />

        <nav>
          <ul
            style={{
              display: 'flex',
              gap: '1.75rem',
              flexWrap: 'wrap',
              justifyContent: 'center',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  style={{
                    textDecoration: 'none',
                    fontSize: 13,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'var(--cream)',
                  }}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p style={{ fontSize: 12, color: 'var(--warm-gray)', margin: 0 }}>
          © {new Date().getFullYear()} Wild June Creative. Personal &amp; business photography in
          the Kansas City area.
        </p>
      </div>
    </footer>
  );
}
