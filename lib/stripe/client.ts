import Stripe from 'stripe';

// Created inside functions that need it, never at module scope —
// instantiating Stripe with a missing key throws immediately, which
// would crash the build if it happened at import time (same class of
// bug we hit earlier with Resend).
export function getStripeClient() {
  return new Stripe(process.env.STRIPE_SECRET_KEY ?? '');
}
