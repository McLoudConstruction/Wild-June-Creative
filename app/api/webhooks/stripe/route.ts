import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendNotification } from '@/lib/notifications/send';
import { sendClientInvite } from '@/lib/admin/invite-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Handles both the very first payment on a booking (full payment or
// installment 1) and every later installment payment made from the
// client's portal — both flows tag their Checkout Session with the
// same metadata shape, so one handler covers both.
export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get('stripe-signature');
  // Stripe's signature verification needs the exact raw request body
  // — parsing it as JSON first (even just to re-stringify) would
  // change the bytes enough to break verification.
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature ?? '',
      process.env.STRIPE_WEBHOOK_SECRET ?? ''
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: `Webhook signature verification failed: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      metadata?: Record<string, string>;
      payment_intent?: string | null;
      customer?: string | null;
    };

    const bookingId = session.metadata?.bookingId;
    const type = session.metadata?.type;
    const installmentId = session.metadata?.installmentId;
    const paymentIntentId = session.payment_intent ?? null;

    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, clients(*)')
        .eq('id', bookingId)
        .single();

      if (booking) {
        // Only the FIRST successful payment moves a booking from
        // pending_payment to confirmed — later installment payments
        // on an already-confirmed booking shouldn't need to touch
        // this again, but re-setting it to 'confirmed' is harmless
        // either way.
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            stripe_customer_id: session.customer ?? null,
          })
          .eq('id', bookingId);

        if (type === 'booking_installment' && installmentId) {
          await supabase
            .from('installments')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              stripe_payment_intent_id: paymentIntentId,
            })
            .eq('id', installmentId);
        }

        const client = (booking as any).clients;

        await sendNotification({
          clientId: client.id,
          clientEmail: client.email,
          clientName: client.full_name,
          type: 'booking_confirmation',
          bookingId: booking.id,
          data: {
            sessionDate: booking.session_date
              ? new Date(booking.session_date).toLocaleDateString()
              : 'to be scheduled',
          },
        });

        // First time this client has ever paid for anything — get
        // them into the portal automatically rather than making them
        // wait for someone to notice and invite them manually.
        if (!client.auth_user_id) {
          try {
            await sendClientInvite(client.id);
          } catch {
            // Booking still succeeded either way — the invite can
            // always be sent manually from the admin dashboard if
            // this hiccups.
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
