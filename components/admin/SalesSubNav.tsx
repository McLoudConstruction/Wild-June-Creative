'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin/sales', label: 'Calendar' },
  { href: '/admin/sales/packages', label: 'Packages' },
];

export function SalesSubNav() {
  const pathname = usePathname();

  return (
    <nav className="admin-tabs" style={{ marginTop: 20 }}>
      {TABS.map((tab) => {
        // Exact match for the Calendar tab so it doesn't also light up
        // while looking at /admin/sales/packages.
        const isActive = tab.href === '/admin/sales' ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className={`admin-tab${isActive ? ' active' : ''}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
