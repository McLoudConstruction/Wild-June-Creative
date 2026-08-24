import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';

export const dynamic = 'force-dynamic';

// Runs once daily (schedule via Vercel Cron in vercel.json).
// Enforces: 3-day grace period after an installment's due date, then
// auto-cancel the booking on day 4 and refund what's been paid minus
// the deposit/processing fee.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Created here, not at module scope — same reasoning as the Resend
  // client in lib/notifications/send.ts: instantiating with a missing
  // key throws immediately, which would crash the build if it happened
  // at import time.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: policy } = await supabase
    .from('cancellation_policy')
    .select('*')
    .eq('active', true)
    .single();

  const gracePeriodDays = policy?.grace_period_days ?? 3;
  const depositFeeCents = policy?.deposit_fee_cents ?? 5000;

  // 1. Find installments that are past due and not yet flagged
  const { data: overdue } = await supabase
    .from('installments')
    .select('*, bookings(*, clients(*))')
    .eq('status', 'scheduled')
    .lt('due_date', today);

  for (const inst of overdue ?? []) {
    const dueDate = new Date(inst.due_date);
    const daysPastDue = Math.floor((Date.now() - dueDate.getTime()) / 86_400_000);
    const booking = inst.bookings as any;
    const client = booking.clients;

    if (daysPastDue >= gracePeriodDays + 1) {
      // Day 4+: auto-cancel the booking and refund minus the fee.
      await cancelBookingForMissedPayment(supabase, booking, client, depositFeeCents, stripe);
    } else if (daysPastDue >= 1) {
      // Within grace period: mark and send warning with days remaining.
      await supabase
        .from('installments')
        .update({ status: 'grace_period' })
        .eq('id', inst.id);

      const daysRemaining = gracePeriodDays - daysPastDue + 1;

      await sendNotification({
        clientId: client.id,
        clientEmail: client.email,
        clientName: client.full_name,
        type: 'payment_grace_warning',
        bookingId: booking.id,
        data: {
          amount: (inst.amount_cents / 100).toFixed(2),
          dueDate: inst.due_date,
          daysRemaining,
        },
      });
    }
  }

  // 2. Send "due today" reminders for installments due today
  const { data: dueToday } = await supabase
    .from('installments')
    .select('*, bookings(*, clients(*))')
    .eq('status', 'scheduled')
    .eq('due_date', today);

  for (const inst of dueToday ?? []) {
    const booking = inst.bookings as any;
    const client = booking.clients;

    await sendNotification({
      clientId: client.id,
      clientEmail: client.email,
      clientName: client.full_name,
      type: 'payment_due_reminder',
      bookingId: booking.id,
      data: {
        amount: (inst.amount_cents / 100).toFixed(2),
        dueDate: inst.due_date,
      },
    });
  }

  return NextResponse.json({ processed: (overdue?.length ?? 0) + (dueToday?.length ?? 0) });
}

async function cancelBookingForMissedPayment(
  supabase: ReturnType<typeof createAdminClient>,
  booking: any,
  client: any,
  depositFeeCents: number,
  stripe: Stripe
) {
  // Sum what's actually been paid so far on this booking
  const { data: paidInstallments } = await supabase
    .from('installments')
    .select('amount_cents, stripe_payment_intent_id')
    .eq('booking_id', booking.id)
    .eq('status', 'paid');

  const totalPaidCents = (paidInstallments ?? []).reduce((sum, i) => sum + i.amount_cents, 0);
  const refundCents = Math.max(totalPaidCents - depositFeeCents, 0);

  // Refund each paid payment intent proportionally, simplest approach:
  // refund the most recent payment intent(s) up to refundCents.
  let remainingToRefund = refundCents;
  for (const inst of paidInstallments ?? []) {
    if (remainingToRefund <= 0) break;
    if (!inst.stripe_payment_intent_id) continue;
    const refundAmount = Math.min(inst.amount_cents, remainingToRefund);
    await stripe.refunds.create({
      payment_intent: inst.stripe_payment_intent_id,
      amount: refundAmount,
    });
    remainingToRefund -= refundAmount;
  }

  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', booking.id);

  await supabase
    .from('installments')
    .update({ status: 'cancelled_booking' })
    .eq('booking_id', booking.id)
    .in('status', ['scheduled', 'grace_period']);

  await sendNotification({
    clientId: client.id,
    clientEmail: client.email,
    clientName: client.full_name,
    type: 'booking_auto_cancelled',
    bookingId: booking.id,
    data: {
      refundAmount: (refundCents / 100).toFixed(2),
      feeAmount: (depositFeeCents / 100).toFixed(2),
    },
  });
}
