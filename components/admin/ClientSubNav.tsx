'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ClientSubNav({ clientId }: { clientId: string }) {
  const pathname = usePathname();

  const tabs = [
    { href: `/admin/clients/${clientId}/gallery`, label: 'Gallery' },
    { href: `/admin/clients/${clientId}/upload`, label: 'Upload' },
  ];

  return (
    <nav className="admin-tabs" style={{ marginTop: 20 }}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`admin-tab${pathname.startsWith(tab.href) ? ' active' : ''}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
