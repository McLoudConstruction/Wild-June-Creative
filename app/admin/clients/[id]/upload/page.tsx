import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGalleryAction } from '@/lib/admin/gallery-actions';

export const dynamic = 'force-dynamic';

// Landing spot for the Upload tab: pick an existing gallery to keep
// adding photos to, or start a brand new one. A repeat client ends up
// with a gallery per session, so "upload" can no longer assume there's
// just one gallery to drop photos into — this is the picker that
// makes that explicit instead of silently guessing "the most recent
// one," which is what the single-gallery version of this page used to
// do.
export default async function ClientUploadPickerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  noStore();
  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!client) {
    notFound();
  }

  const { data: galleries } = await supabase
    .from('galleries')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false });

  const galleryList = galleries ?? [];

  return (
    <div style={{ marginTop: 8 }}>
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {galleryList.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h4
            style={{
              fontSize: 13,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: 8,
            }}
          >
            Upload to an existing gallery
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {galleryList.map((gallery) => (
              <Link
                key={gallery.id}
                href={`/admin/clients/${client.id}/upload/${gallery.id}`}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 14,
                }}
              >
                {gallery.title || 'Untitled gallery'}{' '}
                <span style={{ color: '#888' }}>
                  ({gallery.is_expired ? 'expired' : 'active'})
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div style={{ maxWidth: 400 }}>
        <h4
          style={{
            fontSize: 13,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 8,
          }}
        >
          {galleryList.length > 0 ? 'Or start a new gallery' : 'Create their first gallery'}
        </h4>
        <form action={createGalleryAction}>
          <input type="hidden" name="clientId" value={client.id} />
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="title">Gallery title (optional)</label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="e.g. Smith Family Fall Session"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label htmlFor="availabilityDays">Available for how many days?</label>
            <input
              id="availabilityDays"
              name="availabilityDays"
              type="number"
              defaultValue={30}
              min={1}
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <button type="submit" style={{ padding: '8px 16px' }}>
            Create gallery
          </button>
        </form>
      </div>
    </div>
  );
}
