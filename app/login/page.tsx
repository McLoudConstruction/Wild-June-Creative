import { Header } from '@/components/site/Header';
import { LoginForm } from '@/components/site/LoginForm';

// Prevents this page from being statically prerendered at build time.
// It's a login form — there's nothing to prerender anyway, and static
// generation was triggering Supabase client validation before real
// env vars were relevant. Kept as a Server Component (rather than
// 'use client', which the page used to be) specifically so it can
// render <Header />, which needs server-only cookie access to check
// whether the visitor already has a session.
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <>
      <Header />
      <LoginForm />
    </>
  );
}
