import Link from 'next/link';
import { createClientRecord } from '@/lib/admin/actions';

// Creates a client record only. The invite itself is sent separately
// from the /admin dashboard, whenever it's actually time — not
// automatically the moment this form is submitted.
export const dynamic = 'force-dynamic';

export default function NewClientPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div style={{ maxWidth: 480 }}>
      <Link href="/admin" style={{ fontSize: 13, color: '#666' }}>
        ← Clients
      </Link>
      <h1>Add a new client</h1>
      <p style={{ color: '#666' }}>
        This just creates the record. You'll send their portal invite separately, from the
        dashboard, whenever you're ready.
      </p>

      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <form action={createClientRecord}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" style={{ width: '100%', padding: 8 }} />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Add client
        </button>
      </form>
    </div>
  );
}
