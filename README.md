# Wild June Creative

Photography booking + client gallery portal for wildjunecreative.com.

## Stack
- Next.js 14 (App Router)
- Supabase (Postgres + Auth + Storage), separate project from mcloud-jobs
- Stripe (full payment or installment plans)
- Resend (transactional email, SMS-ready notification layer for later)

## What's scaffolded so far

- **`supabase/migrations/0001_init.sql`** — full schema: clients, session_packages,
  bookings, installments, cancellation_policy, galleries, photos, notifications.
  RLS policies on every client-facing table.
- **`supabase/migrations/0002_storage.sql`** — private `galleries` storage bucket
  with a read policy scoped to the owning client.
- **`lib/supabase/`** — three clients: `client.ts` (browser), `server.ts` (server
  components, respects RLS), `admin.ts` (service_role, bypasses RLS — server-only).
- **`lib/notifications/send.ts`** — single `sendNotification()` entry point.
  Email-only today via Resend; adding SMS later means adding a channel handler
  here, not rewriting the cron jobs or call sites.
- **`app/api/cron/check-installments/route.ts`** — daily job: due-today reminders,
  3-day grace period tracking, auto-cancel on day 4 with Stripe refund minus the
  configured deposit/processing fee.
- **`app/api/cron/check-gallery-expiration/route.ts`** — daily job: 7-day warning
  before expiration, then flips `is_expired` (photos are kept in storage, not
  deleted — reactivation is a manual admin action).
- **`vercel.json`** — cron schedule for both jobs (runs 1x/day).

## Next steps to run this locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` — the Supabase URL/anon key are
   already filled in. Still need: `SUPABASE_SERVICE_ROLE_KEY` (Project Settings
   > API), Stripe keys, `RESEND_API_KEY`, and a `CRON_SECRET` (any random string,
   used to authenticate Vercel's cron calls to the API routes).
3. Run the migrations against your Supabase project: either paste the contents
   of `supabase/migrations/0001_init.sql` and `0002_storage.sql` into the
   Supabase SQL Editor and run them in order, or use the Supabase CLI
   (`supabase db push`) if you want migrations tracked properly going forward.
4. `npm run dev`

## Not yet built (upcoming, per the agreed build order)

1. Client portal auth + gallery viewing UI
2. Booking flow with Stripe Checkout (full payment)
3. Installment payment plan selection + Stripe scheduling
4. Admin photo upload/gallery management UI
5. Marketing site pages
