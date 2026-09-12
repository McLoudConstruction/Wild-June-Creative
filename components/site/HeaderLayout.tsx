import Link from 'next/link';

export type HeaderNavLink = { href: string; label: string };

// Arranges the logo, nav links, trailing items (login/logout), and
// social icons according to logoPosition. Kept as a plain component
// (no 'use client', no hooks) so it can be imported unchanged into
// both the real server-rendered Header and the editor's client-side
// live preview — one layout implementation, two places it renders.
//
// "left" is the original layout, byte-for-byte — nothing about it
// changed when center/right were added. "right" reuses that same
// structure with flex-direction reversed at each level, which mirrors
// everything (including link order) rather than needing separate
// markup. "center" is structurally different: a 3-column grid keeps
// the logo dead-center regardless of how many links end up on each
// side.
export function HeaderLayout({
  logoPosition,
  logo,
  navLinks,
  navTextColor,
  trailingItems,
  social,
}: {
  logoPosition: 'left' | 'center' | 'right';
  logo: React.ReactNode;
  navLinks: HeaderNavLink[];
  navTextColor: string;
  trailingItems: React.ReactNode;
  social: React.ReactNode;
}) {
  const renderLinkList = (links: HeaderNavLink[], extra?: React.ReactNode, reverse?: boolean) => (
    <ul className="nav-list" style={reverse ? { flexDirection: 'row-reverse' } : undefined}>
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="nav-link" style={{ color: navTextColor }}>
            {link.label}
          </Link>
        </li>
      ))}
      {extra}
    </ul>
  );

  if (logoPosition === 'right') {
    return (
      <div className="container header-row" style={{ width: '100%', flexDirection: 'row-reverse' }}>
        {logo}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexDirection: 'row-reverse' }}>
          {renderLinkList(navLinks, trailingItems, true)}
          {social}
        </nav>
      </div>
    );
  }

  if (logoPosition === 'center') {
    const half = Math.ceil(navLinks.length / 2);
    const leftLinks = navLinks.slice(0, half);
    const rightLinks = navLinks.slice(half);

    return (
      <div className="container header-center-grid" style={{ width: '100%', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{renderLinkList(leftLinks)}</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>{logo}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>{renderLinkList(rightLinks)}</div>
        <div className="header-center-utility">
          <ul className="nav-list">{trailingItems}</ul>
          {social}
        </div>
      </div>
    );
  }

  // left — unchanged from the original single-layout header
  return (
    <div className="container header-row" style={{ width: '100%' }}>
      {logo}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
        {renderLinkList(navLinks, trailingItems)}
        {social}
      </nav>
    </div>
  );
}
