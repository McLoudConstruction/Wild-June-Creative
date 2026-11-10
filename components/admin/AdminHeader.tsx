import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { AdminSignOutButton } from '@/components/admin/AdminSignOutButton';

export async function AdminHeader() {
  // Set by middleware.ts once an admin check has passed. Display
  // only — nothing here authorizes anything.
  const signedInAs = (await headers()).get('x-admin-user');

  return (
    <header className="admin-header">
      <div className="container header-row">
        <Link href="/admin" aria-label="Wild June Creative admin home">
          <Image
            src="/brand/wordmark-dark.png"
            alt="Wild June Creative"
            width={1593}
            height={483}
            priority
            style={{ height: 'auto', width: '160px' }}
          />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--warm-gray)',
            }}
          >
            Studio admin
          </span>
          {signedInAs && (
            <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>{signedInAs}</span>
          )}
          <AdminSignOutButton />
        </div>
      </div>
    </header>
  );
}
