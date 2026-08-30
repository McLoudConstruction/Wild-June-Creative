'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GallerySubNav({ clientId, galleryId }: { clientId: string; galleryId: string }) {
  const pathname = usePathname();
  const base = `/admin/clients/${clientId}/gallery/${galleryId}`;

  const tabs = [
    // Exact match only — every other tab's path starts with `base`
    // too, so without `exact` the Photos tab would show active on
    // every tab.
    { href: base, label: 'Photos', exact: true },
    { href: `${base}/upload`, label: 'Upload', exact: false },
    { href: `${base}/manage`, label: 'Manage', exact: false },
  ];

  return (
    <nav className="admin-tabs" style={{ marginTop: 20 }}>
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`admin-tab${isActive ? ' active' : ''}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
