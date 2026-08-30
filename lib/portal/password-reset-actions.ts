'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

// Requests a password-reset email for a client. Always resolves to
// the same generic { ok: true } regardless of whether the email
// actually matches an account with a login — deliberately, since
// confirming or denying that an email is registered is itself
// information a "forgot password" form shouldn't leak to whoever's
// typing it in. Only a wrong client-side input (empty field) is
// reported back with a real error.
export async function requestPasswordResetAction(
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return { ok: false, error: 'Enter your email address.' };
  }

  const supabase = createAdminClient();

  // Only clients who've already gone through the invite flow (and so
  // have an auth_user_id and a real login) are eligible — a recovery
  // link can't be generated for someone who was never invited, since
  // there's no Supabase Auth user to reset a password for.
  const { data: client } = await supabase
    .from('clients')
    .select('id, email, full_name, auth_user_id')
    .ilike('email', trimmedEmail)
    .maybeSingle();

  if (client?.auth_user_id) {
    const { data: linkData, error: linkGenError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: client.email,
      options: {
        // Same landing page the invite flow uses — it already knows
        // how to read a Supabase implicit-flow fragment token
        // (#access_token=…) and establish a session from it, whether
        // that token came from an invite or, as here, a recovery link.
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/portal/set-password`,
      },
    });

    if (linkGenError || !linkData?.properties?.action_link) {
      // Logged for your own visibility, but never surfaced to the
      // person submitting the form — see the note above about not
      // confirming/denying account existence.
      console.error('Failed to generate password reset link:', linkGenError);
    } else {
      await sendNotification({
        clientId: client.id,
        clientEmail: client.email,
        clientName: client.full_name ?? '',
        type: 'password_reset',
        data: { resetLink: linkData.properties.action_link },
      });
    }
  }

  return { ok: true };
}
