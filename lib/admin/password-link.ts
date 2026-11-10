import { createAdminClient } from '@/lib/supabase/admin';
import { sendAdminEmail } from '@/lib/notifications/admin-email';

// Deliberately NOT a 'use server' file: every export of one of those
// is a publicly callable endpoint, and this function distinguishes
// "is an admin" from "isn't", which nobody outside the app should be
// able to probe. It's only ever called from inside other server code
// (the forgot-password action and the Settings → Admins actions).

// Where the emailed link lands. Must be allowed under Supabase →
// Authentication → URL Configuration → Redirect URLs, same as the
// client portal's /portal/set-password.
export function adminSetPasswordUrl() {
  return `${process.env.NEXT_PUBLIC_SITE_URL}/admin/set-password`;
}

// Mails an existing admin a fresh "choose a password" link.
export async function sendAdminPasswordLink(email: string): Promise<{ error: string | null; notAdmin?: boolean }> {
  const supabase = createAdminClient();

  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('email')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!adminRow) {
    return { error: 'No admin with that email.', notAdmin: true };
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: adminRow.email,
    options: { redirectTo: adminSetPasswordUrl() },
  });

  if (linkError || !linkData?.properties?.action_link) {
    return { error: linkError?.message ?? 'Could not generate a link.' };
  }

  return sendAdminEmail({
    to: adminRow.email,
    subject: 'Reset your Wild June Creative admin password',
    html: `<p>Click below to choose a new password for the Wild June Creative admin:</p><p><a href="${linkData.properties.action_link}">Choose a new password</a></p><p>This link expires soon and can only be used once. If you didn't request this, you can ignore this email — your password won't change.</p>`,
  });
}
