import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  updateGalleryDetailsAction,
  addGalleryViewerAction,
  removeGalleryViewerAction,
} from '@/lib/admin/gallery-manage-actions';

export const dynamic = 'force-dynamic';

export default async function ClientGalleryManagePage({
  params,
  searchParams,
}: {
  params: { id: string; galleryId: string };
  searchParams: { error?: string; success?: string };
}) {
  noStore();
  const supabase = createAdminClient();

  const { data: gallery } = await supabase
    .from('galleries')
    .select('*')
    .eq('id', params.galleryId)
    .eq('client_id', params.id)
    .maybeSingle();

  if (!gallery) {
    notFound();
  }

  const { data: owner } = await supabase
    .from('clients')
    .select('full_name, email')
    .eq('id', params.id)
    .maybeSingle();

  const { data: viewerRows } = await supabase
    .from('gallery_viewers')
    .select('client_id, clients(id, full_name, email, auth_user_id)')
    .eq('gallery_id', gallery.id);

  const viewers = (viewerRows ?? [])
    .map((row) => row.clients as unknown as {
      id: string;
      full_name: string;
      email: string;
      auth_user_id: string | null;
    })
    .filter(Boolean);

  // Date input needs a bare yyyy-mm-dd, not a full ISO timestamp.
  const expiresAtValue = gallery.expires_at ? gallery.expires_at.slice(0, 10) : '';

  return (
    <div style={{ marginTop: 16, maxWidth: 560 }}>
      {searchParams.success === 'details_updated' && (
        <p style={{ color: 'green' }}>Gallery details updated.</p>
      )}
      {searchParams.success === 'viewer_added' && (
        <p style={{ color: 'green' }}>Viewer added — an invite was sent to them.</p>
      )}
      {searchParams.success === 'viewer_added_no_invite' && (
        <p style={{ color: '#b8860b' }}>
          Viewer added, but the invite email failed to send. Use "Send invite" for them from the
          main client list.
        </p>
      )}
      {searchParams.success === 'viewer_already_added' && (
        <p style={{ color: 'green' }}>That person already has access to this gallery.</p>
      )}
      {searchParams.success === 'viewer_removed' && (
        <p style={{ color: 'green' }}>Viewer access removed.</p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <section style={{ marginBottom: 32 }}>
        <h4
          style={{
            fontSize: 13,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12,
          }}
        >
          Gallery details
        </h4>
        <form
          action={updateGalleryDetailsAction}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input type="hidden" name="clientId" value={params.id} />
          <input type="hidden" name="galleryId" value={gallery.id} />
          <div>
            <label htmlFor="title" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              defaultValue={gallery.title ?? ''}
              placeholder="e.g. Smith Family Fall Session"
              style={{ width: '100%', padding: 8 }}
            />
          </div>
          <div>
            <label htmlFor="expiresAt" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Expires on
            </label>
            <input
              id="expiresAt"
              name="expiresAt"
              type="date"
              defaultValue={expiresAtValue}
              disabled={!gallery.expires_at}
              style={{ padding: 8 }}
            />
          </div>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" name="neverExpires" defaultChecked={!gallery.expires_at} />
            Never expires
          </label>
          <div>
            <button type="submit" style={{ padding: '8px 16px' }}>
              Save changes
            </button>
          </div>
          {gallery.is_expired && (
            <p style={{ fontSize: 13, color: '#b8860b', margin: 0 }}>
              This gallery is currently expired — setting a future date above (or checking "Never
              expires") restores the client's access immediately.
            </p>
          )}
        </form>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h4
          style={{
            fontSize: 13,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 12,
          }}
        >
          Who can view this gallery
        </h4>

        <div
          style={{
            border: '1px solid #eee',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 12,
            fontSize: 14,
          }}
        >
          <strong>{owner?.full_name}</strong>{' '}
          <span style={{ color: '#888' }}>({owner?.email})</span>
          <span style={{ color: '#888', fontSize: 12 }}> — owner</span>
        </div>

        {viewers.length === 0 ? (
          <p style={{ color: '#888', fontSize: 14 }}>
            No one else has been added yet — this gallery is only visible to the client above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {viewers.map((viewer) => (
              <div
                key={viewer.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <div>
                  <strong>{viewer.full_name}</strong>{' '}
                  <span style={{ color: '#888' }}>({viewer.email})</span>
                  {!viewer.auth_user_id && (
                    <span style={{ color: '#b8860b', fontSize: 12 }}> — invite pending</span>
                  )}
                </div>
                <form action={removeGalleryViewerAction}>
                  <input type="hidden" name="clientId" value={params.id} />
                  <input type="hidden" name="galleryId" value={gallery.id} />
                  <input type="hidden" name="viewerClientId" value={viewer.id} />
                  <button
                    type="submit"
                    style={{ fontSize: 12, padding: '4px 10px', color: 'crimson' }}
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}

        <form
          action={addGalleryViewerAction}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}
        >
          <input type="hidden" name="clientId" value={params.id} />
          <input type="hidden" name="galleryId" value={gallery.id} />
          <label htmlFor="viewerEmail" style={{ fontSize: 13 }}>
            Add a viewer
          </label>
          <input
            id="viewerEmail"
            name="viewerEmail"
            type="email"
            placeholder="Email address"
            required
            style={{ padding: 8 }}
          />
          <input
            id="viewerName"
            name="viewerName"
            type="text"
            placeholder="Name (only needed if they're not an existing client)"
            style={{ padding: 8 }}
          />
          <div>
            <button type="submit" style={{ padding: '8px 16px' }}>
              Add viewer
            </button>
          </div>
          <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
            If they don't already have a portal login, adding them here also sends an invite
            email, same as inviting a new client.
          </p>
        </form>
      </section>
    </div>
  );
}
