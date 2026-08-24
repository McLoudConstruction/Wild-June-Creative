import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWatermarkSettings } from '@/lib/admin/watermark';
import {
  createGalleryAction,
  uploadPhotosAction,
  deletePhotoAction,
} from '@/lib/admin/gallery-actions';

export const dynamic = 'force-dynamic';

export default async function ClientGalleryPage({
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

  // One client can technically have more than one gallery over time,
  // but for now we work with their most recent one — multi-gallery
  // client history is a later refinement, not needed for the core
  // viewing experience.
  const { data: gallery } = await supabase
    .from('galleries')
    .select('*')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: photos } = gallery
    ? await supabase
        .from('photos')
        .select('*')
        .eq('gallery_id', gallery.id)
        .order('sort_order', { ascending: true })
    : { data: [] };

  // Signed URLs so the (private) storage bucket's images can actually
  // render here — 1 hour is plenty for an admin reviewing an upload.
  // The grid uses the small thumbnail specifically, not the full
  // compressed image, so scanning a big upload stays fast.
  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const pathForGrid = photo.thumbnail_path ?? photo.storage_path;
      const { data: signed } = await supabase.storage
        .from('galleries')
        .createSignedUrl(pathForGrid, 3600);
      return { ...photo, url: signed?.signedUrl ?? null };
    })
  );

  return (
    <div style={{ maxWidth: 900, margin: '60px auto', padding: '0 16px' }}>
      <h1>Gallery — {client.full_name}</h1>
      <p style={{ color: '#666' }}>{client.email}</p>

      {searchParams.success === 'gallery_created' && (
        <p style={{ color: 'green' }}>Gallery created.</p>
      )}
      {searchParams.success === 'photos_uploaded' && (
        <p style={{ color: 'green' }}>Photos uploaded.</p>
      )}
      {searchParams.success === 'photo_deleted' && (
        <p style={{ color: 'green' }}>Photo deleted.</p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {!gallery ? (
        <div style={{ marginTop: 24 }}>
          <p>This client doesn't have a gallery yet.</p>
          <form action={createGalleryAction} style={{ maxWidth: 400 }}>
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
        <div style={{ marginTop: 24 }}>
          <p style={{ color: '#666' }}>
            {gallery.title || 'Untitled gallery'} — expires{' '}
            {gallery.expires_at ? new Date(gallery.expires_at).toLocaleDateString() : 'never'}
          </p>

          <form action={uploadPhotosAction} style={{ margin: '16px 0' }}>
            <input type="hidden" name="galleryId" value={gallery.id} />
            <input type="hidden" name="clientId" value={client.id} />
            <input type="file" name="photos" accept="image/*" multiple required />
            <div style={{ marginTop: 8 }}>
              <label>
                <input
                  type="checkbox"
                  name="applyWatermark"
                  defaultChecked={watermarkConfigured}
                  disabled={!watermarkConfigured}
                />{' '}
                Apply watermark to these photos
                {!watermarkConfigured && (
                  <span style={{ color: '#888' }}>
                    {' '}
                    — <Link href="/admin/settings/watermark">set one up first</Link>
                  </span>
                )}
              </label>
            </div>
            <button type="submit" style={{ padding: '8px 16px', marginTop: 8 }}>
              Upload photos
            </button>
          </form>

          {photosWithUrls.length === 0 ? (
            <p style={{ color: '#888' }}>No photos uploaded yet.</p>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 8,
                marginTop: 16,
              }}
            >
              {photosWithUrls.map((photo) => (
                <div key={photo.id} style={{ position: 'relative' }}>
                  {photo.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo.url}
                      alt={photo.file_name}
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 4 }}
                    />
                  )}
                  {photo.is_watermarked && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 4,
                        left: 4,
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 3,
                      }}
                    >
                      Watermarked
                    </span>
                  )}
                  <form action={deletePhotoAction} style={{ marginTop: 4 }}>
                    <input type="hidden" name="photoId" value={photo.id} />
                    <input type="hidden" name="storagePath" value={photo.storage_path} />
                    <input type="hidden" name="thumbnailPath" value={photo.thumbnail_path ?? ''} />
                    <input type="hidden" name="clientId" value={client.id} />
                    <button
                      type="submit"
                      style={{ fontSize: 12, padding: '2px 8px', color: 'crimson' }}
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
