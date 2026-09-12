'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/settings/branding', label: 'Branding' },
  { href: '/admin/settings/watermark', label: 'Watermark' },
];

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-tabs" style={{ marginTop: 20 }}>
      {TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`admin-tab${isActive ? ' active' : ''}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
