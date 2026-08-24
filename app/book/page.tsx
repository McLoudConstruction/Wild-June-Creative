import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function BookPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  noStore();
  // RLS-scoped client works fine here even for an anonymous visitor —
  // the "Anyone can view active packages" policy has no auth check,
  // it just filters to is_active = true.
  const supabase = await createClient();
  const { data: packages } = await supabase
    .from('session_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  return (
    <div style={{ maxWidth: 700, margin: '60px auto', padding: '0 16px' }}>
      <h1>Book a session</h1>

      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {!packages || packages.length === 0 ? (
        <p style={{ color: '#888' }}>No packages available right now — check back soon.</p>
      ) : (
        <div style={{ marginTop: 24 }}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0 }}>{pkg.name}</h2>
              {pkg.description && <p style={{ color: '#666' }}>{pkg.description}</p>}
              <p style={{ fontWeight: 'bold' }}>${(pkg.price_cents / 100).toFixed(2)}</p>
              <Link href={`/book/${pkg.id}`}>Select this package →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
