'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Header } from '@/components/site/Header';

// Prevents this page from being statically prerendered at build time.
// It's a login form — there's nothing to prerender anyway, and static
// generation was triggering Supabase client validation before real
// env vars were relevant.
export const dynamic = 'force-dynamic';

// Every return visit after the one-time invite goes through here.
// Clients never self-register — accounts only get created via the
// admin invite flow — so this page is purely a login form, no sign-up
// link.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingForInvite, setCheckingForInvite] = useState(true);

  useEffect(() => {
    // Browsers carry an unclaimed URL fragment forward through
    // same-origin redirects. If an invite link's tokens end up here
    // instead of landing cleanly on /portal/set-password (a stale
    // link, an unexpected redirect hop, whatever the cause), rescue
    // it here rather than showing a confusing login form to someone
    // who doesn't have a password yet.
    const hash = window.location.hash;

    if (hash && hash.includes('access_token') && hash.includes('type=invite')) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');

      if (access_token && refresh_token) {
        const supabase = createClient();
        supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
          if (!error) {
            router.replace('/portal/set-password');
            return;
          }
          setCheckingForInvite(false);
        });
        return;
      }
    }

    setCheckingForInvite(false);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (signInError) {
      setError('Incorrect email or password.');
      return;
    }

    router.push('/portal');
  }

  if (checkingForInvite) {
    return (
      <>
        <Header />
        <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 16px' }}>
          <p>Checking your link…</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 16px' }}>
        <h1>Client login</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          {error && <p style={{ color: 'crimson' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          New clients receive a one-time invite link by email — there's no self-signup here.
        </p>
      </div>
    </>
  );
}
