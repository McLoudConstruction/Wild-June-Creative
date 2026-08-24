'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getStripeClient } from '@/lib/stripe/client';

// Uses the RLS-scoped client, not admin — the "Clients can view their
// own installments" policy is what actually stops someone from paying
// (or even discovering) an installment on a booking that isn't
// theirs, since this runs as their session.
export async function payInstallmentAction(formData: FormData) {
  const installmentId = formData.get('installmentId') as string;

  const supabase = await createClient();

  const { data: installment } = await supabase
    .from('installments')
    .select('*, bookings(*, clients(*))')
    .eq('id', installmentId)
    .single();

  if (!installment) {
    redirect(`/portal?error=${encodeURIComponent('Payment not found.')}`);
  }

  const booking = (installment as any).bookings;
  const client = booking.clients;

  const stripe = getStripeClient();
  let sessionUrl: string | undefined;

  try {
    // Same metadata shape as the initial booking checkout — the
    // Stripe webhook handles both through one code path.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Installment ${installment!.installment_number} payment`,
            },
            unit_amount: installment!.amount_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: client.email,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/portal`,
      metadata: {
        bookingId: booking.id,
        type: 'booking_installment',
        installmentId: installment!.id,
      },
    });
    sessionUrl = session.url ?? undefined;
  } catch (err) {
    redirect(
      `/portal?error=${encodeURIComponent(
        `Couldn't start checkout: ${err instanceof Error ? err.message : 'unknown error'}`
      )}`
    );
  }

  if (!sessionUrl) {
    redirect(`/portal?error=${encodeURIComponent('Checkout could not be started.')}`);
  }

  redirect(sessionUrl);
}
