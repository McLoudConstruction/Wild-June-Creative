import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Every magic link (invite or future login link) redirects here first.
// Supabase's client-side JS normally handles this automatically, but
// doing it as a Route Handler lets us control exactly where the
// client lands next — /portal/set-password on their first-ever visit,
// or straight into /portal for anything else.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/portal';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Link was invalid, expired, or already used.
  return NextResponse.redirect(`${origin}/login?error=invite_link_expired`);
}
