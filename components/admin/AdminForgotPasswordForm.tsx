'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestAdminPasswordResetAction } from '@/lib/admin/admin-auth-actions';

export function AdminForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await requestAdminPasswordResetAction(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <p>
          If that email belongs to an admin, a link to choose a new password is on its way. It
          expires soon, so use it right away.
        </p>
        <p style={{ fontSize: 14 }}>
          <Link href="/admin/login">Back to login</Link>
        </p>
      </div>
    );
  }

  return (
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
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary" style={{ border: 'none', cursor: 'pointer' }}>
        {loading ? 'Sending…' : 'Send reset link'}
      </button>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/admin/login">Back to login</Link>
      </p>
    </form>
  );
}
