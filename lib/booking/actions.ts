'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripeClient } from '@/lib/stripe/client';

const INSTALLMENT_COUNT = 3;
const DAYS_BETWEEN_INSTALLMENTS = 30;

export async function createBookingAndCheckout(formData: FormData) {
  const packageId = formData.get('packageId') as string;
  const fullName = (formData.get('fullName') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const sessionDate = (formData.get('sessionDate') as string) || null;
  const notes = (formData.get('notes') as string)?.trim() || null;
  const paymentPlan =
    (formData.get('paymentPlan') as string) === 'installments' ? 'installments' : 'full';

  if (!packageId || !fullName || !email) {
    redirect(
      `/book/${packageId}?error=${encodeURIComponent('Please fill in your name and email.')}`
    );
  }

  const supabase = createAdminClient();

  const { data: pkg, error: pkgError } = await supabase
    .from('session_packages')
    .select('*')
    .eq('id', packageId)
    .eq('is_active', true)
    .single();

  if (pkgError || !pkg) {
    redirect(`/book?error=${encodeURIComponent('That package is no longer available.')}`);
  }

  // Reuse the client record if this email has booked before — same
  // person, same client row, rather than creating a duplicate.
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let clientId = existingClient?.id;

  if (!clientId) {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ full_name: fullName, email, phone })
      .select('id')
      .single();

    if (clientError || !newClient) {
      redirect(
        `/book/${packageId}?error=${encodeURIComponent(
          'Something went wrong creating your booking. Please try again or contact us.'
        )}`
      );
    }

    clientId = newClient!.id;
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      package_id: pkg!.id,
      status: 'pending_payment',
      session_date: sessionDate,
      payment_plan: paymentPlan,
      total_amount_cents: pkg!.price_cents,
      notes,
    })
    .select()
    .single();

  if (bookingError || !booking) {
    redirect(
      `/book/${packageId}?error=${encodeURIComponent(
        'Something went wrong creating your booking. Please try again or contact us.'
      )}`
    );
  }

  // For installments: the client only pays the FIRST installment
  // right now, through this same Checkout flow. The remaining
  // installments get created as 'scheduled' rows — the daily cron job
  // (check-installments) handles reminders and the 3-day grace period
  // enforcement for those automatically, and the client pays each one
  // from their portal when it's due (see lib/portal/payment-actions.ts).
  let checkoutAmountCents = pkg!.price_cents;
  let checkoutDescription = pkg!.name;
  let installmentId: string | null = null;

  if (paymentPlan === 'installments') {
    const base = Math.floor(pkg!.price_cents / INSTALLMENT_COUNT);
    const remainder = pkg!.price_cents - base * INSTALLMENT_COUNT;
    const amounts = Array.from({ length: INSTALLMENT_COUNT }, (_, i) =>
      i === INSTALLMENT_COUNT - 1 ? base + remainder : base
    );

    const today = new Date();
    const installmentRows = amounts.map((amount, i) => {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + i * DAYS_BETWEEN_INSTALLMENTS);
      return {
        booking_id: booking!.id,
        installment_number: i + 1,
        amount_cents: amount,
        due_date: dueDate.toISOString().split('T')[0],
        status: 'scheduled' as const,
      };
    });

    const { data: insertedInstallments, error: instError } = await supabase
      .from('installments')
      .insert(installmentRows)
      .select();

    if (instError || !insertedInstallments) {
      redirect(
        `/book/${packageId}?error=${encodeURIComponent(
          'Something went wrong setting up your payment plan. Please contact us.'
        )}`
      );
    }

    const firstInstallment = insertedInstallments!.find((i) => i.installment_number === 1)!;
    checkoutAmountCents = firstInstallment.amount_cents;
    checkoutDescription = `${pkg!.name} — Installment 1 of ${INSTALLMENT_COUNT}`;
    installmentId = firstInstallment.id;
  }

  const stripe = getStripeClient();
  let sessionUrl: string | undefined;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: checkoutDescription },
            unit_amount: checkoutAmountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/confirmation?booking=${booking!.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/book/${packageId}`,
      metadata: {
        bookingId: booking!.id,
        type: paymentPlan === 'installments' ? 'booking_installment' : 'booking_full',
        installmentId: installmentId ?? '',
      },
    });
    sessionUrl = session.url ?? undefined;
  } catch (err) {
    redirect(
      `/book/${packageId}?error=${encodeURIComponent(
        `Couldn't start checkout: ${err instanceof Error ? err.message : 'unknown error'}`
      )}`
    );
  }

  if (!sessionUrl) {
    redirect(
      `/book/${packageId}?error=${encodeURIComponent('Checkout could not be started. Please try again.')}`
    );
  }

  redirect(sessionUrl);
}
