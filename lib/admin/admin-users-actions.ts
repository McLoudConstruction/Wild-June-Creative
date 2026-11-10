'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { adminSetPasswordUrl, sendAdminPasswordLink } from '@/lib/admin/password-link';
import { sendAdminEmail } from '@/lib/notifications/admin-email';

// Every action here starts with requireAdmin(): these grant and
// revoke access to the whole dashboard, and a Server Action can be
// POSTed to any URL, not just ones the middleware guards (see
// lib/admin/auth.ts). Exports from this file are all callable
// endpoints, so only the three form actions are exported.

const BACK = '/admin/settings/admins';

function fail(message: string): never {
  redirect(`${BACK}?error=${encodeURIComponent(message)}`);
}

// Settings → Admins → "Add admin". Creates the login if the email has
// none yet, adds them to admin_users, and emails a link to choose a
// password.
export async function inviteAdminAction(formData: FormData) {
  await requireAdmin();

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail('Enter a valid email address.');
  }

  const supabase = createAdminClient();

  const { data: already } = await supabase
    .from('admin_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (already) {
    fail(`${email} is already an admin.`);
  }

  const redirectTo = adminSetPasswordUrl();

  // "invite" creates the login if it doesn't exist. If the email is
  // already registered (a client with a portal login, or someone who
  // finished setup earlier), Supabase refuses to invite them again —
  // fall back to a recovery link, which lets them choose a password
  // for that existing login instead.
  let { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  });

  if (linkError) {
    ({ data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    }));
  }

  if (linkError || !linkData?.user || !linkData.properties?.action_link) {
    fail(`Couldn't create a login for ${email}: ${linkError?.message ?? 'no link returned'}`);
  }

  const { error: insertError } = await supabase
    .from('admin_users')
    .insert({ auth_user_id: linkData.user.id, email });

  if (insertError) {
    fail(
      insertError.code === '23505'
        ? `${email} is already an admin.`
        : `Couldn't add ${email}: ${insertError.message}`
    );
  }

  const { error: sendError } = await sendAdminEmail({
    to: email,
    subject: "You've been added as a Wild June Creative admin",
    html: `<p>You've been given admin access to the Wild June Creative dashboard.</p><p><a href="${linkData.properties.action_link}">Set up your login</a></p><p>This link expires soon and can only be used once. If it stops working, use "Forgot your password?" on the admin login page to get a new one.</p>`,
  });

  revalidatePath(BACK);

  if (sendError) {
    fail(
      `${email} was added, but the email couldn't be sent (${sendError}). Use "Send reset link" on their row to try again.`
    );
  }

  redirect(`${BACK}?success=${encodeURIComponent(`Invite sent to ${email}.`)}`);
}

// Removes dashboard access only — the underlying login stays (it may
// also be a client's portal login), it just stops being an admin.
export async function removeAdminAction(formData: FormData) {
  const current = await requireAdmin();

  const adminId = formData.get('adminId') as string;
  if (!adminId) {
    fail('Missing admin.');
  }

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from('admin_users')
    .select('id, email')
    .eq('id', adminId)
    .maybeSingle();

  if (!target) {
    fail('That admin no longer exists.');
  }

  if (target.email === current.email) {
    fail("You can't remove your own access. Ask another admin to do it.");
  }

  const { count } = await supabase
    .from('admin_users')
    .select('id', { count: 'exact', head: true });

  if ((count ?? 0) <= 1) {
    fail("You can't remove the last admin — nobody would be able to log in.");
  }

  const { error } = await supabase.from('admin_users').delete().eq('id', adminId);

  if (error) {
    fail(error.message);
  }

  revalidatePath(BACK);
  redirect(`${BACK}?success=${encodeURIComponent(`${target.email} no longer has admin access.`)}`);
}

// "Send reset link" on an existing admin's row.
export async function sendAdminResetAction(formData: FormData) {
  await requireAdmin();

  const email = ((formData.get('email') as string) ?? '').trim().toLowerCase();
  if (!email) {
    fail('Missing email.');
  }

  const { error } = await sendAdminPasswordLink(email);

  if (error) {
    fail(`Couldn't send the link to ${email}: ${error}`);
  }

  redirect(`${BACK}?success=${encodeURIComponent(`Reset link sent to ${email}.`)}`);
}
