'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientInvite } from '@/lib/admin/invite-client';

// Creates a client record only — no invite is sent. They'll show up
// on the /admin dashboard, where you send (or wait to send) their
// invite whenever it's actually time, via a separate button.
export async function createClientRecord(formData: FormData) {
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim() || null;

  if (!fullName || !email) {
    redirect(`/admin/clients/new?error=${encodeURIComponent('Name and email are required.')}`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('clients').insert({ full_name: fullName, email, phone });

  if (error) {
    redirect(`/admin/clients/new?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin?success=created');
}

// The dashboard's "Send invite" / "Resend invite" button calls this
// directly — one click, one email, right when you decide it's time.
export async function sendInviteAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;

  if (!clientId) {
    redirect(`/admin?error=${encodeURIComponent('Missing client.')}`);
  }

  // redirect() works by throwing internally, so it must never sit
  // inside a try block whose catch would swallow that throw and
  // mistake it for a real error — that's what produced the literal
  // "NEXT_REDIRECT" text on screen. Capture the outcome here, then
  // redirect once, fully outside the try/catch.
  let email: string | undefined;
  let errorMessage: string | undefined;

  try {
    email = await sendClientInvite(clientId);
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown error';
  }

  if (errorMessage) {
    redirect(`/admin?error=${encodeURIComponent(errorMessage)}`);
  }

  redirect(`/admin?success=invited&email=${encodeURIComponent(email!)}`);
}

// Edit form submits here. If the client already has a login and their
// email is changing, the login's email gets updated too (with
// email_confirm: true so it takes effect immediately, no separate
// confirmation step) — otherwise they'd be locked out, logging in
// with an email that no longer matches their client record.
export async function updateClientRecord(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim() || null;

  if (!clientId || !fullName || !email) {
    redirect(
      `/admin/clients/${clientId}/edit?error=${encodeURIComponent('Name and email are required.')}`
    );
  }

  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from('clients')
    .select('email, auth_user_id')
    .eq('id', clientId)
    .single();

  if (fetchError || !existing) {
    redirect(`/admin?error=${encodeURIComponent('Client not found.')}`);
  }

  if (existing.auth_user_id && existing.email !== email) {
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      existing.auth_user_id,
      { email, email_confirm: true }
    );

    if (authUpdateError) {
      redirect(
        `/admin/clients/${clientId}/edit?error=${encodeURIComponent(
          `Failed to update login email: ${authUpdateError.message}`
        )}`
      );
    }
  }

  const { error } = await supabase
    .from('clients')
    .update({ full_name: fullName, email, phone })
    .eq('id', clientId);

  if (error) {
    redirect(`/admin/clients/${clientId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=updated`);
}

// Deleting a client also deletes their Supabase Auth login, not just
// the clients row. Skipping that step would leave an orphaned login
// behind — exactly the "email already registered" problem we hit
// earlier when a client row was deleted without cleaning up the auth
// side too. Bookings/galleries/photos/notifications all cascade-delete
// automatically via the foreign keys already set up in the schema.
export async function deleteClientAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;

  if (!clientId) {
    redirect(`/admin?error=${encodeURIComponent('Missing client.')}`);
  }

  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single();

  if (client?.auth_user_id) {
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(client.auth_user_id);
    if (deleteAuthError) {
      redirect(
        `/admin?error=${encodeURIComponent(
          `Failed to delete login: ${deleteAuthError.message}. Client record was not deleted either — try again.`
        )}`
      );
    }
  }

  const { error } = await supabase.from('clients').delete().eq('id', clientId);

  if (error) {
    redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin?success=deleted');
}
