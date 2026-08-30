import { Header } from '@/components/site/Header';
import { ForgotPasswordForm } from '@/components/site/ForgotPasswordForm';

// Server Component wrapper, same reasoning as app/login/page.tsx —
// it needs to render <Header />, which checks the visitor's session
// server-side and so can't be imported into a 'use client' file.
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <ForgotPasswordForm />
    </>
  );
}
