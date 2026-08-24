import { createBrowserClient } from '@supabase/ssr';

// Used in Client Components. Runs with the anon key — RLS policies
// enforce what this client is actually allowed to see or change.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
