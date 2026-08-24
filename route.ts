import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';

// Every magic link (invite or future login link) redirects here
// first. There are two different formats Supabase can hand back,
// depending on how the link was generated:
//   - token_hash + type: what admin.generateLink() produces (invite
//     links, since there's no browser involved yet to hold PKCE
//     verifier state) — verified via verifyOtp().
//   - code: the PKCE flow used when a link is requested client-side
//     (e.g. a future "magic link login" button) — verified via
//     exchangeCodeForSession(). Handling both means this route works
//     regardless of which flow produced the link.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/portal';

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Link was invalid, expired, or already used.
  return NextResponse.redirect(`${origin}/login?error=invite_link_expired`);
}
