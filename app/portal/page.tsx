import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { payInstallmentAction } from '@/lib/portal/payment-actions';

// This page depends entirely on the logged-in user's session — it
// can never be meaningfully prerendered as static HTML, so don't try.
export const dynamic = 'force-dynamic';

export default async function PortalPage({
  searchParams,
}: {
  searchParams: { paid?: string; error?: string };
}) {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: client } = await supabase
    .from('clients')
    .select('full_name, email')
    .eq('auth_user_id', user.id)
    .single();

  // RLS scopes this to installments on bookings the logged-in client
  // actually owns. Only showing what's still owed — paid and
  // cancelled installments don't need a spot on this list.
  const { data: upcomingInstallments } = await supabase
    .from('installments')
    .select('*, bookings(*)')
    .in('status', ['scheduled', 'grace_period'])
    .order('due_date', { ascending: true });

  // RLS already scopes this to the logged-in client's own galleries —
  // the "Clients can view their own non-expired galleries" policy
  // checks ownership, not expiration, on purpose. Expiration is
  // handled here at the application level instead, so an expired
  // gallery still shows up (as "Expired") rather than just vanishing
  // with no explanation.
  const { data: galleries } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div style={{ maxWidth: 700, margin: '48px auto', padding: '0 16px' }}>
      <h1>Welcome{client?.full_name ? `, ${client.full_name}` : ''}!</h1>
      <p style={{ color: '#666' }}>Logged in as {client?.email ?? user.email}</p>

      {searchParams.paid === '1' && (
        <p style={{ color: 'green' }}>Payment received — thank you!</p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {upcomingInstallments && upcomingInstallments.length > 0 && (
        <div style={{ marginTop: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18 }}>Upcoming payments</h2>
          {upcomingInstallments.map((inst) => (
            <div
              key={inst.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>${(inst.amount_cents / 100).toFixed(2)}</strong>
                <span style={{ color: '#666' }}>
                  {' '}
                  — due {new Date(inst.due_date).toLocaleDateString()}
                </span>
                {inst.status === 'grace_period' && (
                  <p style={{ color: '#b8860b', fontSize: 13, margin: '4px 0 0' }}>
                    Past due — please pay soon to avoid cancellation.
                  </p>
                )}
              </div>
              <form action={payInstallmentAction}>
                <input type="hidden" name="installmentId" value={inst.id} />
                <button type="submit" style={{ padding: '6px 14px' }}>
                  Pay now
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {!galleries || galleries.length === 0 ? (
        <p style={{ color: '#888', marginTop: 24 }}>
          Your gallery isn't ready yet — check back soon, or reach out if you were expecting one.
        </p>
      ) : (
        <div style={{ marginTop: 24 }}>
          {galleries.map((gallery) => (
            <div
              key={gallery.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>{gallery.title || 'Your gallery'}</h2>
              {gallery.is_expired ? (
                <p style={{ color: '#888' }}>This gallery has expired.</p>
              ) : (
                <>
                  {gallery.expires_at && (
                    <p style={{ color: '#666', fontSize: 14 }}>
                      Available until {new Date(gallery.expires_at).toLocaleDateString()}
                    </p>
                  )}
                  <Link href={`/portal/gallery/${gallery.id}`}>View gallery →</Link>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
