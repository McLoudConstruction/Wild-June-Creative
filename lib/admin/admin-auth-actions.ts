'use server';

import { sendAdminPasswordLink } from '@/lib/admin/password-link';

// The /admin/forgot-password form. Always resolves to the same
// { ok: true } whether or not the email belongs to an admin —
// confirming which emails have admin access is exactly what a
// forgot-password form shouldn't leak. Only an empty field gets a
// real error back; any internal failure is logged, not shown.
export async function requestAdminPasswordResetAction(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = email.trim();

  if (!trimmed) {
    return { ok: false, error: 'Enter your email address.' };
  }

  const result = await sendAdminPasswordLink(trimmed);

  if (result.error && !result.notAdmin) {
    console.error('Admin password reset failed:', result.error);
  }

  return { ok: true };
}
