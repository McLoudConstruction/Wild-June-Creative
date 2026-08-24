import { createAndInviteClient } from '@/lib/admin/actions';

// Internal-only tool: create a client record and immediately send
// their one-time invite email. Protected by Basic Auth at the
// middleware level (see middleware.ts) rather than Supabase auth,
// since this is a single-operator admin tool for now, not something
// clients ever see.
export const dynamic = 'force-dynamic';

export default function NewClientPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; email?: string };
}) {
  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 16px' }}>
      <h1>Add a new client</h1>
      <p style={{ color: '#666' }}>
        Creates the client record and immediately sends them a one-time invite link by
        email.
      </p>

      {searchParams.success && (
        <p style={{ color: 'green' }}>Invite sent to {searchParams.email}.</p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <form action={createAndInviteClient}>
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
          Create client &amp; send invite
        </button>
      </form>
    </div>
  );
}
