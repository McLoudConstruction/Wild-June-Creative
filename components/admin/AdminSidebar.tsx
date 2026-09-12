'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin', label: 'Clients', match: (path: string) => path === '/admin' || path.startsWith('/admin/clients') },
  { href: '/admin/pages', label: 'Pages', match: (path: string) => path.startsWith('/admin/pages') },
  { href: '/admin/sales', label: 'Sales', match: (path: string) => path.startsWith('/admin/sales') },
  { href: '/admin/settings', label: 'Settings', match: (path: string) => path.startsWith('/admin/settings') },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <p className="admin-sidebar-heading">Main navigation</p>
      <ul className="admin-nav-list">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`admin-nav-link${item.match(pathname) ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
