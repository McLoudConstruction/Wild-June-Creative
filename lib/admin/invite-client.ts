import { createAdminClient } from '@/lib/supabase/admin';

// Called from admin tooling (not client-facing) when a new client is
// added — e.g. right after a booking inquiry is confirmed. Creates
// the auth.users record and sends a one-time invite email containing
// a magic link. Clicking it logs the client in and drops them on
// /portal/set-password to create their own password. The link is
// single-use and expires — if it lapses, re-run this function to
// resend a fresh one rather than trying to recover the old link.
export async function inviteClient(clientId: string, email: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/portal/set-password`,
  });

  if (error) {
    throw new Error(`Failed to invite client: ${error.message}`);
  }

  // Link the new auth user back to their existing clients row so RLS
  // policies (auth.uid() = auth_user_id) start working immediately.
  const { error: linkError } = await supabase
    .from('clients')
    .update({ auth_user_id: data.user.id })
    .eq('id', clientId);

  if (linkError) {
    throw new Error(`Invited user but failed to link client record: ${linkError.message}`);
  }

  return data.user;
}
