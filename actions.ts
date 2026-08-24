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
