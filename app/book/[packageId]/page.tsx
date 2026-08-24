import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createBookingAndCheckout } from '@/lib/booking/actions';

export const dynamic = 'force-dynamic';

export default async function BookPackagePage({
  params,
  searchParams,
}: {
  params: { packageId: string };
  searchParams: { error?: string };
}) {
  noStore();
  const supabase = await createClient();
  const { data: pkg } = await supabase
    .from('session_packages')
    .select('*')
    .eq('id', params.packageId)
    .eq('is_active', true)
    .maybeSingle();

  if (!pkg) {
    notFound();
  }

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h1>{pkg.name}</h1>
      {pkg.description && <p style={{ color: '#666' }}>{pkg.description}</p>}
      <p style={{ fontWeight: 'bold', fontSize: 20 }}>${(pkg.price_cents / 100).toFixed(2)}</p>

      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <form action={createBookingAndCheckout}>
        <input type="hidden" name="packageId" value={pkg.id} />

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="sessionDate">Preferred session date (optional)</label>
          <input
            id="sessionDate"
            name="sessionDate"
            type="date"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="notes">Anything we should know? (optional)</label>
          <textarea id="notes" name="notes" rows={3} style={{ width: '100%', padding: 8 }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6 }}>
            <input type="radio" name="paymentPlan" value="full" defaultChecked /> Pay in full — $
            {(pkg.price_cents / 100).toFixed(2)}
          </label>
          <label style={{ display: 'block' }}>
            <input type="radio" name="paymentPlan" value="installments" /> Pay in 3 installments —
            ${(pkg.price_cents / 300).toFixed(2)}/mo
          </label>
        </div>

        <button type="submit" style={{ padding: '10px 20px' }}>
          Continue to payment
        </button>
      </form>
    </div>
  );
}
