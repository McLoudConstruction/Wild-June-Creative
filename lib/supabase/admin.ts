import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// DANGER: this client uses the service_role key and bypasses RLS
// entirely. Only import this in server-only code — API routes,
// Server Actions, cron/edge functions. NEVER import this into
// anything that ships to the browser.
//
// Use cases: admin uploading photos to a client's gallery, the
// installment-check cron job cancelling bookings, Stripe webhook
// handlers writing payment status.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
