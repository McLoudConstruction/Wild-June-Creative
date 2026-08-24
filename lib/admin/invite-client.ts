import { createAdminClient } from '@/lib/supabase/admin';
import { Resend } from 'resend';

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

// Sends — or resends — the one-time portal invite to a client. Safe
// to call more than once: creates their login on the first call, then
// on every later "Send/Resend invite" click, reuses that same login
// and generates a fresh link, rather than erroring out on "user
// already exists" the way calling Supabase's invite endpoint twice
// normally would.
//
// This stops making sense once the client has actually finished
// account setup (set a password) — at that point Supabase won't hand
// back a fresh invite link for them, since they're no longer in the
// "unconfirmed" state invite links are for. The dashboard hides the
// button once a client is Active for this reason; if it's ever called
// on an Active client anyway, it throws a clear error explaining they
// should use /login instead.
export async function sendClientInvite(clientId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (clientError || !client) {
    throw new Error('Client not found.');
  }

  let authUserId: string | null = client.auth_user_id;

  // First-ever invite for this client: create their login now.
  // email_confirm: false is what keeps them eligible for invite links
  // (confirmed users can't get a fresh "invite" type link generated).
  if (!authUserId) {
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: client.email,
      email_confirm: false,
    });

    if (createError || !created.user) {
      // Deleting a row from the clients table doesn't delete the
      // underlying Supabase Auth login — the two aren't linked by a
      // cascade. If a client was deleted and re-added with the same
      // email, createUser correctly reports the email as already
      // registered. Rather than treating that as a hard failure, find
      // the existing login and reuse it instead — this is the normal
      // path for re-adding a client, not an error case.
      const alreadyExists = /already.*registered/i.test(createError?.message ?? '');

      if (alreadyExists) {
        const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        const match = existingUsers?.users.find(
          (u) => u.email?.toLowerCase() === client.email.toLowerCase()
        );

        if (listError || !match) {
          throw new Error(
            `Email is already registered to a login, but couldn't find/reuse it: ${listError?.message ?? 'no matching user found'}. You may need to delete the orphaned login manually in Supabase Authentication → Users.`
          );
        }

        authUserId = match.id;
      } else {
        throw new Error(
          `Failed to create login for client: ${createError?.message ?? 'unknown error'}`
        );
      }
    } else {
      authUserId = created.user.id;
    }

    const { error: linkError } = await supabase
      .from('clients')
      .update({ auth_user_id: authUserId })
      .eq('id', clientId);

    if (linkError) {
      throw new Error(`Created login but failed to link client record: ${linkError.message}`);
    }
  }

  const { data: linkData, error: linkGenError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email: client.email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/portal/set-password`,
    },
  });

  if (linkGenError || !linkData?.properties?.action_link) {
    throw new Error(
      `Couldn't generate an invite link (${linkGenError?.message ?? 'no link returned'}). ` +
        `If this client already finished setting up their account, they should log in at /login instead — this button is only for clients who haven't set a password yet.`
    );
  }

  const resend = getResendClient();
  const { error: sendError } = await resend.emails.send({
    from: process.env.NOTIFICATIONS_FROM_EMAIL ?? 'bookings@wildjunecreative.com',
    to: client.email,
    subject: 'Your Wild June Creative client portal',
    html: `<p>Hi ${client.full_name},</p><p>Click below to set up your account and view your gallery:</p><p><a href="${linkData.properties.action_link}">Set up my account</a></p>`,
  });

  // Resend's SDK returns errors as data rather than throwing — a
  // failed send (wrong/unverified sender domain, bad API key, etc.)
  // would otherwise sail through silently and get reported as
  // success. Surface it properly instead.
  if (sendError) {
    throw new Error(`Email failed to send: ${sendError.message}`);
  }

  await supabase
    .from('clients')
    .update({ invite_sent_at: new Date().toISOString() })
    .eq('id', clientId);

  return client.email;
}
