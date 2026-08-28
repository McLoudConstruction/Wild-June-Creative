import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWatermarkSettings } from '@/lib/admin/watermark';
import { createGalleryAction } from '@/lib/admin/gallery-actions';
import { GalleryUploader } from '@/components/GalleryUploader';

export const dynamic = 'force-dynamic';
// Gives the per-photo processing action (compress + watermark +
// thumbnail) real headroom — a large original can take a few seconds
// through sharp, and this page is where that action gets invoked
// from.
export const maxDuration = 60;

export default async function ClientUploadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string };
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

  const watermarkSettings = await getWatermarkSettings();
  const watermarkConfigured = Boolean(watermarkSettings?.storage_path);

  const { data: gallery } = await supabase
    .from('galleries')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: folders } = gallery
    ? await supabase
        .from('photo_folders')
        .select('*')
        .eq('gallery_id', gallery.id)
        .order('sort_order', { ascending: true })
    : { data: [] };

  return (
    <div style={{ marginTop: 8 }}>
      {searchParams.success === 'gallery_created' && (
        <p style={{ color: 'green' }}>
          Gallery created. Upload photos below whenever you're ready.
        </p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {!gallery ? (
        <div style={{ maxWidth: 400 }}>
          <p style={{ color: '#666' }}>This client doesn't have a gallery yet.</p>
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
      ) : (
        <>
          <p style={{ color: '#666' }}>
            {gallery.title || 'Untitled gallery'} — expires{' '}
            {gallery.expires_at ? new Date(gallery.expires_at).toLocaleDateString() : 'never'}
          </p>

          <GalleryUploader
            galleryId={gallery.id}
            watermarkConfigured={watermarkConfigured}
            folders={folders ?? []}
          />

          <p style={{ marginTop: 16, fontSize: 13 }}>
            <Link href={`/admin/clients/${client.id}/gallery`}>View gallery →</Link>
          </p>
        </>
      )}
    </div>
  );
}
