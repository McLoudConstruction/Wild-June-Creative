'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordResetAction } from '@/lib/portal/password-reset-actions';

// Deliberately shows the same "check your email" confirmation whether
// or not the address actually matches an account — see
// requestPasswordResetAction for why. That means this form itself
// never needs to handle a "no account found" case.
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await requestPasswordResetAction(email);

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 16px' }}>
        <h1>Check your email</h1>
        <p>
          If an account exists for that address, a link to reset your password is on its way.
          It should arrive within a few minutes — check spam if you don't see it.
        </p>
        <p style={{ marginTop: 16, fontSize: 14 }}>
          <Link href="/login">Back to login</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '48px auto', padding: '0 16px' }}>
      <h1>Reset your password</h1>
      <p style={{ color: '#666', fontSize: 15 }}>
        Enter the email address on your account and we'll send you a link to choose a new
        password.
      </p>
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
        <button type="submit" disabled={loading} style={{ padding: '8px 16px' }}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14 }}>
        <Link href="/login">Back to login</Link>
      </p>
    </div>
  );
}
