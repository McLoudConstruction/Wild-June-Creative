-- Tracks when the most recent invite/resend was sent, for display on
-- the admin dashboard. Doesn't affect access control — auth_user_id
-- and Supabase's own email_confirmed_at are what actually gate login.
alter table public.clients add column invite_sent_at timestamptz;
