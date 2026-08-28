import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWatermarkSettings } from '@/lib/admin/watermark';
import { createGalleryAction, createFolderAction, renameFolderAction } from '@/lib/admin/gallery-actions';
import { GalleryUploader } from '@/components/GalleryUploader';
import { BackToDashboard } from '@/components/admin/BackToDashboard';
import { DeleteFolderButton } from '@/components/admin/DeleteFolderButton';
import { PhotoGrid } from '@/components/admin/PhotoGrid';

export const dynamic = 'force-dynamic';
// Gives the per-photo processing action (compress + watermark +
// thumbnail) real headroom — a large original can take a few seconds
// through sharp, and this page is where that action gets invoked
// from.
export const maxDuration = 60;

export default async function ClientGalleryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string; count?: string };
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

  const { data: folders } = gallery
    ? await supabase
        .from('photo_folders')
        .select('*')
        .eq('gallery_id', gallery.id)
        .order('sort_order', { ascending: true })
    : { data: [] };

  const folderList = folders ?? [];

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
      <BackToDashboard />
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
      {searchParams.success === 'folder_created' && (
        <p style={{ color: 'green' }}>Folder created.</p>
      )}
      {searchParams.success === 'folder_renamed' && (
        <p style={{ color: 'green' }}>Folder renamed.</p>
      )}
      {searchParams.success === 'folder_deleted' && (
        <p style={{ color: 'green' }}>Folder deleted. Its photos are now unsorted.</p>
      )}
      {searchParams.success === 'photo_moved' && (
        <p style={{ color: 'green' }}>Photo moved.</p>
      )}
      {searchParams.success === 'photos_moved' && (
        <p style={{ color: 'green' }}>
          {searchParams.count ?? 'Selected'} photo{searchParams.count === '1' ? '' : 's'} moved.
        </p>
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

          <GalleryUploader
            galleryId={gallery.id}
            watermarkConfigured={watermarkConfigured}
            folders={folderList}
          />

          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid #eee',
            }}
          >
            <h3 style={{ fontSize: 15 }}>Folders</h3>
            <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              Group photos into named albums — e.g. "Reception - Family Photos" vs "Reception -
              Dancing". Each folder becomes its own section (and its own pre-named, split-if-large
              zip download) in the client's gallery.
            </p>

            <form
              action={createFolderAction}
              style={{ display: 'flex', gap: 8, maxWidth: 400, marginTop: 12 }}
            >
              <input type="hidden" name="galleryId" value={gallery.id} />
              <input type="hidden" name="clientId" value={client.id} />
              <input
                name="name"
                type="text"
                placeholder="New folder name"
                required
                style={{ flex: 1, padding: 8 }}
              />
              <button type="submit" style={{ padding: '8px 16px' }}>
                Add folder
              </button>
            </form>

            {folderList.length > 0 && (
              <ul style={{ marginTop: 16, paddingLeft: 0, listStyle: 'none' }}>
                {folderList.map((folder) => (
                  <li
                    key={folder.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '6px 0',
                      borderBottom: '1px solid #f2f2f2',
                    }}
                  >
                    <form
                      action={renameFolderAction}
                      style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}
                    >
                      <input type="hidden" name="folderId" value={folder.id} />
                      <input type="hidden" name="clientId" value={client.id} />
                      <input
                        name="name"
                        type="text"
                        defaultValue={folder.name}
                        style={{ flex: 1, padding: 6, fontSize: 13 }}
                      />
                      <button type="submit" style={{ fontSize: 12, padding: '4px 10px' }}>
                        Rename
                      </button>
                    </form>
                    <DeleteFolderButton folderId={folder.id} clientId={client.id} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {photosWithUrls.length === 0 ? (
            <p style={{ color: '#888', marginTop: 16 }}>No photos uploaded yet.</p>
          ) : (
            <PhotoGrid photos={photosWithUrls} folders={folderList} clientId={client.id} />
          )}
        </div>
      )}
    </div>
  );
}
