import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createFolderAction, renameFolderAction } from '@/lib/admin/gallery-actions';
import { DeleteFolderButton } from '@/components/admin/DeleteFolderButton';
import { PhotoGrid } from '@/components/admin/PhotoGrid';

export const dynamic = 'force-dynamic';

export default async function ClientGalleryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string; success?: string; count?: string; folder?: string };
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

  const unsortedCount = photosWithUrls.filter((p) => !p.folder_id).length;

  // searchParams.folder drives which section the sidebar highlights
  // and which photos PhotoGrid shows — omitted entirely means "All
  // Photos" (every folder shown, grouped).
  const activeFolder = searchParams.folder;

  return (
    <div>
      {searchParams.success === 'gallery_created' && (
        <p style={{ color: 'green' }}>Gallery created.</p>
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
      {searchParams.success === 'updated' && (
        <p style={{ color: 'green' }}>Client updated.</p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {!gallery ? (
        <p style={{ color: '#888', marginTop: 16 }}>
          This client doesn't have a gallery yet — head to{' '}
          <Link href={`/admin/clients/${client.id}/upload`}>Upload</Link> to create one and add
          photos.
        </p>
      ) : (
        <div style={{ display: 'flex', gap: 32, marginTop: 8, alignItems: 'flex-start' }}>
          <aside style={{ width: 220, flexShrink: 0 }}>
            <h4
              style={{
                fontSize: 13,
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Folders
            </h4>

            <nav style={{ display: 'flex', flexDirection: 'column', marginTop: 8 }}>
              <Link
                href={`/admin/clients/${client.id}/gallery`}
                style={{
                  padding: '6px 8px',
                  borderRadius: 4,
                  fontSize: 14,
                  background: !activeFolder ? '#eee' : 'transparent',
                  fontWeight: !activeFolder ? 600 : 400,
                }}
              >
                All photos ({photosWithUrls.length})
              </Link>

              {folderList.map((folder) => {
                const count = photosWithUrls.filter((p) => p.folder_id === folder.id).length;
                const isActive = activeFolder === folder.id;
                return (
                  <Link
                    key={folder.id}
                    href={`/admin/clients/${client.id}/gallery?folder=${folder.id}`}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 4,
                      fontSize: 14,
                      background: isActive ? '#eee' : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {folder.name} ({count})
                  </Link>
                );
              })}

              {unsortedCount > 0 && (
                <Link
                  href={`/admin/clients/${client.id}/gallery?folder=unsorted`}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 4,
                    fontSize: 14,
                    color: '#888',
                    background: activeFolder === 'unsorted' ? '#eee' : 'transparent',
                    fontWeight: activeFolder === 'unsorted' ? 600 : 400,
                  }}
                >
                  Unsorted ({unsortedCount})
                </Link>
              )}
            </nav>

            <form
              action={createFolderAction}
              style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}
            >
              <input type="hidden" name="galleryId" value={gallery.id} />
              <input type="hidden" name="clientId" value={client.id} />
              <input
                name="name"
                type="text"
                placeholder="New folder name"
                required
                style={{ padding: 6, fontSize: 13 }}
              />
              <button type="submit" style={{ padding: '6px 10px', fontSize: 13 }}>
                Add folder
              </button>
            </form>

            {folderList.length > 0 && activeFolder && activeFolder !== 'unsorted' && (
              <div style={{ marginTop: 16, borderTop: '1px solid #eee', paddingTop: 12 }}>
                {(() => {
                  const folder = folderList.find((f) => f.id === activeFolder);
                  if (!folder) return null;
                  return (
                    <>
                      <form
                        action={renameFolderAction}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                      >
                        <input type="hidden" name="folderId" value={folder.id} />
                        <input type="hidden" name="clientId" value={client.id} />
                        <input
                          name="name"
                          type="text"
                          defaultValue={folder.name}
                          style={{ padding: 6, fontSize: 13 }}
                        />
                        <button type="submit" style={{ padding: '6px 10px', fontSize: 13 }}>
                          Rename folder
                        </button>
                      </form>
                      <div style={{ marginTop: 8 }}>
                        <DeleteFolderButton folderId={folder.id} clientId={client.id} />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </aside>

          <div style={{ flex: 1, minWidth: 0 }}>
            {photosWithUrls.length === 0 ? (
              <p style={{ color: '#888' }}>No photos uploaded yet.</p>
            ) : (
              <PhotoGrid
                photos={photosWithUrls}
                folders={folderList}
                clientId={client.id}
                galleryId={gallery.id}
                filterFolderId={activeFolder}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
