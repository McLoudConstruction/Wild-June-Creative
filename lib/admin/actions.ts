'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteClient } from '@/lib/admin/invite-client';

// Called from the admin "new client" form. Creates the client row
// first, then sends their one-time invite. If the invite step fails
// after the client record was already created, we don't roll back —
// the client exists, it just needs a fresh invite sent (re-running
// this form with the same email will fail on the unique constraint,
// so a resend path will need its own button eventually; for now,
// delete-and-recreate or invite manually via Supabase dashboard).
export async function createAndInviteClient(formData: FormData) {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim() || null;

  if (!fullName || !email) {
    redirect(`/admin/clients/new?error=${encodeURIComponent('Name and email are required.')}`);
  }

  const supabase = createAdminClient();

  const { data: client, error } = await supabase
    .from('clients')
    .insert({ full_name: fullName, email, phone })
    .select()
    .single();

  if (error) {
    redirect(`/admin/clients/new?error=${encodeURIComponent(error.message)}`);
  }

  try {
    await inviteClient(client.id, email);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    redirect(
      `/admin/clients/new?error=${encodeURIComponent(
        `Client was created but the invite email failed to send: ${message}`
      )}`
    );
  }

  redirect(`/admin/clients/new?success=1&email=${encodeURIComponent(email)}`);
}
