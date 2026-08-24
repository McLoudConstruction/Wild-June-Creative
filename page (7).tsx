import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// This page depends entirely on the logged-in user's session — it
// can never be meaningfully prerendered as static HTML, so don't try.
export const dynamic = 'force-dynamic';

export default async function PortalPage() {
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
    <div style={{ maxWidth: 700, margin: '80px auto', padding: '0 16px' }}>
      <h1>Welcome{client?.full_name ? `, ${client.full_name}` : ''}!</h1>
      <p style={{ color: '#666' }}>Logged in as {client?.email ?? user.email}</p>

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
