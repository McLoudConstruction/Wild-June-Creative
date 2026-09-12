import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPackageAction, togglePackageActiveAction } from '@/lib/admin/package-actions';

export const dynamic = 'force-dynamic';

export default async function PackagesSettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  noStore();
  const supabase = createAdminClient();
  const { data: packages } = await supabase
    .from('session_packages')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div style={{ maxWidth: 600 }}>
      <p style={{ color: '#666' }}>
        These show up on the public booking page at /book — only active ones are visible to
        clients.
      </p>

      {searchParams.success && <p style={{ color: 'green' }}>Saved.</p>}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <form
        action={createPackageAction}
        style={{ marginBottom: 32, border: '1px solid #eee', padding: 16, borderRadius: 8 }}
      >
        <h2>Add a package</h2>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" required style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="description">Description (optional)</label>
          <textarea id="description" name="description" rows={2} style={{ width: '100%', padding: 8 }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="price">Price ($)</label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="galleryAvailabilityDays">
            Gallery available for how many days after delivery?
          </label>
          <input
            id="galleryAvailabilityDays"
            name="galleryAvailabilityDays"
            type="number"
            defaultValue={30}
            min={1}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Add package
        </button>
      </form>

      {packages && packages.length > 0 && (
        <div>
          <h2>Existing packages</h2>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #eee',
                padding: '8px 0',
              }}
            >
              <div>
                <strong>{pkg.name}</strong> — ${(pkg.price_cents / 100).toFixed(2)}{' '}
                <span style={{ color: pkg.is_active ? 'green' : '#888' }}>
                  {pkg.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <form action={togglePackageActiveAction}>
                <input type="hidden" name="packageId" value={pkg.id} />
                <input type="hidden" name="nextActive" value={(!pkg.is_active).toString()} />
                <button type="submit" style={{ padding: '6px 12px' }}>
                  {pkg.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
