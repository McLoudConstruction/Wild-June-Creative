import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { matchLegacyBasicAuth } from '@/lib/admin/legacy-auth';

// Server-side "who is this admin?" check for Server Actions that do
// something sensitive. middleware.ts already gates every /admin page
// load, but a Server Action is just a POST that doesn't have to be
// sent to an /admin URL, so the actions that manage admin access
// re-verify the caller themselves rather than trusting that they got
// here through the middleware. (That also means this deliberately
// does NOT read the x-admin-user header — a caller could simply send
// that header themselves on a route the middleware never touches.)
export async function getCurrentAdmin(): Promise<{ email: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (adminRow) return { email: adminRow.email };
  }

  const legacyUser = matchLegacyBasicAuth((await headers()).get('authorization'));
  if (legacyUser) return { email: legacyUser };

  return null;
}

export async function requireAdmin(): Promise<{ email: string }> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect('/admin/login');
  }
  return admin;
}
