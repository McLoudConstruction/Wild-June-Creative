'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export function AdminLoginForm({ next, showLegacyLink }: { next: string; showLegacyLink: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !data.user) {
      setLoading(false);
      setError('Incorrect email or password.');
      return;
    }

    // A valid login isn't enough — clients have logins too. Being an
    // admin means having a row in admin_users (RLS lets a signed-in
    // user read only their own). middleware.ts runs the same check on
    // every /admin request; doing it here as well just lets someone
    // without access hear about it instead of bouncing back to this
    // form with no explanation.
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', data.user.id)
      .maybeSingle();

    if (!adminRow) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account doesn't have admin access.");
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: '100%', padding: 8 }}
        />
      </div>
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <Link href="/admin/forgot-password">Forgot your password?</Link>
      </p>
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary" style={{ border: 'none', cursor: 'pointer' }}>
        {loading ? 'Logging in…' : 'Log in'}
      </button>
      {showLegacyLink && (
        <p style={{ marginTop: 24, fontSize: 13, color: 'var(--warm-gray)' }}>
          Having trouble with the new login?{' '}
          <a href={`/admin/legacy?next=${encodeURIComponent(next)}`}>Use the old admin password</a>{' '}
          (temporary).
        </p>
      )}
    </form>
  );
}
