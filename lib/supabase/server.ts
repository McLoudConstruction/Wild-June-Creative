import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Used in Server Components / Route Handlers. Still runs as the
// logged-in user (anon key + their session cookie) — RLS still
// applies. Use lib/supabase/admin.ts instead for anything that needs
// to bypass RLS (admin uploads, cron jobs, webhooks).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore if you
            // have middleware refreshing sessions.
          }
        },
      },
    }
  );
}
