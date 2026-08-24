import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// This page depends entirely on the logged-in user's session — it
// can never be meaningfully prerendered as static HTML, so don't try.
export const dynamic = 'force-dynamic';

// Placeholder — this is where gallery viewing gets built next. For
// now it just confirms the client is authenticated and shows who
// they're logged in as, so we can verify the whole invite → set
// password → login → portal flow works before building the gallery UI
// on top of it.
export default async function PortalPage() {
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

  return (
    <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 16px' }}>
      <h1>Welcome{client?.full_name ? `, ${client.full_name}` : ''}!</h1>
      <p>Logged in as {client?.email ?? user.email}</p>
      <p style={{ color: '#888' }}>Your gallery will appear here.</p>
    </div>
  );
}
