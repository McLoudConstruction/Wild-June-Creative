-- Galleries originally required a booking_id, but the booking/Stripe
-- flow doesn't exist yet. Making this nullable lets galleries be
-- created directly (via the admin tool) ahead of that, and once
-- bookings exist, new galleries can still link to one when relevant.
alter table public.galleries alter column booking_id drop not null;
