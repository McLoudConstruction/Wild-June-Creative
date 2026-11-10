import Image from 'next/image';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { legacyAdminAuthEnabled } from '@/lib/admin/legacy-auth';

export const dynamic = 'force-dynamic';

// Outside the (dashboard) route group on purpose, so it renders
// without the admin sidebar/header — you can't have those before
// you're signed in. middleware.ts lets this path through without an
// admin session (and bounces you on to the dashboard if you already
// have one).
export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const requested = searchParams.next;
  // Same rule middleware.ts applies: only /admin paths, never an
  // absolute or protocol-relative URL.
  const next = requested && requested.startsWith('/admin') && !requested.startsWith('//') ? requested : '/admin';

  return (
    <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 16px' }}>
      <Image
        src="/brand/wordmark-dark.png"
        alt="Wild June Creative"
        width={1593}
        height={483}
        priority
        style={{ height: 'auto', width: '160px', marginBottom: 24 }}
      />
      <h1>Admin login</h1>
      <AdminLoginForm next={next} showLegacyLink={legacyAdminAuthEnabled()} />
    </div>
  );
}
