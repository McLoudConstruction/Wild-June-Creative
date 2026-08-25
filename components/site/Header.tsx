import Image from 'next/image';
import Link from 'next/link';
import { NAV_LINKS } from '@/lib/site/nav';
import { SocialLinks } from './SocialLinks';

export function Header() {
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
          </ul>
          <SocialLinks color="var(--ink)" />
        </nav>
      </div>
    </header>
  );
}
