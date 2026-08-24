-- Wild June Creative — Initial schema
-- Covers: clients, bookings, installment plans, galleries, photos, notifications

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
create type booking_status as enum ('pending_payment', 'confirmed', 'completed', 'cancelled');
create type payment_plan_type as enum ('full', 'installments');
create type installment_status as enum ('scheduled', 'paid', 'grace_period', 'missed', 'cancelled_booking');
create type notification_type as enum (
  'booking_confirmation',
  'payment_due_reminder',
  'payment_grace_warning',
  'booking_auto_cancelled',
  'gallery_expiring_soon',
  'gallery_expired'
);
create type notification_channel as enum ('email', 'sms');

-- ============================================================
-- CLIENTS
-- Each client is tied 1:1 to a Supabase auth user once they create
-- a portal login. profile can exist before signup (admin creates it
-- when a booking inquiry comes in), auth_user_id gets filled in later.
-- ============================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Clients can view their own record"
  on public.clients for select
  using (auth.uid() = auth_user_id);

-- Admin access is handled via service_role key in server-side routes,
-- which bypasses RLS entirely — no separate admin policy needed here.

-- ============================================================
-- SESSION PACKAGES (admin-managed pricing/offerings)
-- ============================================================
create table public.session_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  deposit_cents integer, -- if null, full payment or installments only
  gallery_availability_days integer not null default 30, -- admin-configurable expiration window
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.session_packages enable row level security;

create policy "Anyone can view active packages"
  on public.session_packages for select
  using (is_active = true);

-- ============================================================
-- BOOKINGS
-- ============================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  package_id uuid not null references public.session_packages(id),
  status booking_status not null default 'pending_payment',
  session_date timestamptz,
  payment_plan payment_plan_type not null default 'full',
  total_amount_cents integer not null,
  stripe_customer_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Clients can view their own bookings"
  on public.bookings for select
  using (
    client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

-- ============================================================
-- INSTALLMENT PLANS
-- One row per scheduled installment on a booking. Grace period and
-- auto-cancellation logic (3-day grace, cancel on day 4) is enforced
-- by a scheduled job — see /supabase/functions/check-installments.
-- ============================================================
create table public.installments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  installment_number integer not null,
  amount_cents integer not null,
  due_date date not null,
  status installment_status not null default 'scheduled',
  stripe_payment_intent_id text,
  paid_at timestamptz,
  grace_period_ends_at date, -- due_date + 3 days
  created_at timestamptz not null default now()
);

alter table public.installments enable row level security;

create policy "Clients can view their own installments"
  on public.installments for select
  using (
    booking_id in (
      select b.id from public.bookings b
      join public.clients c on c.id = b.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- Cancellation fee / refund policy config (kept in its own small table
-- so the deposit/processing fee amount is editable without a code change)
create table public.cancellation_policy (
  id uuid primary key default gen_random_uuid(),
  deposit_fee_cents integer not null default 5000, -- non-refundable portion, e.g. $50
  grace_period_days integer not null default 3,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.cancellation_policy enable row level security;
-- No public policy — admin/server-side only via service_role.

-- ============================================================
-- GALLERIES
-- One gallery per booking. Expiration window comes from the
-- package's gallery_availability_days at time of creation, but is
-- stored directly on the gallery so it can be manually extended
-- per-client without touching the package default.
-- ============================================================
create table public.galleries (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  title text,
  published_at timestamptz,
  expires_at timestamptz,
  is_expired boolean not null default false,
  expiring_soon_notified_at timestamptz, -- prevents duplicate 7-day warnings
  created_at timestamptz not null default now()
);

alter table public.galleries enable row level security;

create policy "Clients can view their own non-expired galleries"
  on public.galleries for select
  using (
    client_id in (select id from public.clients where auth_user_id = auth.uid())
  );

-- ============================================================
-- PHOTOS
-- ============================================================
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  storage_path text not null, -- path in the 'galleries' Supabase Storage bucket
  file_name text not null,
  is_favorite boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Clients can view photos in their own galleries"
  on public.photos for select
  using (
    gallery_id in (
      select g.id from public.galleries g
      join public.clients c on c.id = g.client_id
      where c.auth_user_id = auth.uid()
    )
  );

create policy "Clients can favorite photos in their own galleries"
  on public.photos for update
  using (
    gallery_id in (
      select g.id from public.galleries g
      join public.clients c on c.id = g.client_id
      where c.auth_user_id = auth.uid()
    )
  )
  with check (
    gallery_id in (
      select g.id from public.galleries g
      join public.clients c on c.id = g.client_id
      where c.auth_user_id = auth.uid()
    )
  );

-- ============================================================
-- NOTIFICATIONS
-- Log of every notification sent/scheduled. The `channel` column is
-- what makes this SMS-ready later — email is the only channel wired
-- up today, but the schema and sending logic don't need to change
-- when Twilio gets added, just a new channel handler.
-- ============================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  gallery_id uuid references public.galleries(id) on delete cascade,
  type notification_type not null,
  channel notification_channel not null default 'email',
  sent_at timestamptz,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending', -- pending | sent | failed
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
-- No client policy — notifications are sent server-side, clients never
-- query this table directly from the browser.

-- ============================================================
-- UPDATED_AT TRIGGER (bookings)
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ============================================================
-- SEED: default cancellation policy row
-- ============================================================
insert into public.cancellation_policy (deposit_fee_cents, grace_period_days)
values (5000, 3);
