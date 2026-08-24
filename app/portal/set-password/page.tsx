'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

// Landing page after a client clicks their one-time invite link.
// Supabase issues these as implicit-flow links — the session tokens
// arrive as a URL fragment (#access_token=…&refresh_token=…), which
// only exists in the browser and is never sent to a server. So this
// page itself has to read it on load and manually establish the
// session, rather than expecting a server-side route to have already
// done that.
export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash || !hash.includes('access_token')) {
      setSessionError(
        'This invite link looks incomplete or has already been used. Ask for a fresh invite from the dashboard.'
      );
      return;
    }

    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');

    if (!access_token || !refresh_token) {
      setSessionError('This invite link is missing required information. Ask for a fresh one.');
      return;
    }

    const supabase = createClient();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        setSessionError(`This invite link has expired or already been used: ${error.message}`);
        return;
      }
      // Clean the tokens out of the visible URL now that they're used.
      window.history.replaceState(null, '', window.location.pathname);
      setSessionReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push('/portal');
  }

  if (sessionError) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
        <h1>Link problem</h1>
        <p style={{ color: 'crimson' }}>{sessionError}</p>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
        <p>Setting things up…</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1>Welcome! Set up your account</h1>
      <p>Choose a password you'll use to log back into your gallery anytime.</p>
      <form onSubmit={handleSubmit}>
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
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="confirmPassword">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Saving...' : 'Set password & continue'}
        </button>
      </form>
    </div>
  );
}
