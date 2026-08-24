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

  try {
    const email = await sendClientInvite(clientId);
    redirect(`/admin?success=invited&email=${encodeURIComponent(email)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    redirect(`/admin?error=${encodeURIComponent(message)}`);
  }
}
