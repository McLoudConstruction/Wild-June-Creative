import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Lists every gallery this client has — repeat clients (a family that
// books a session every year, for example) end up with one gallery
// per session, not just one ever. Each links through to that
// gallery's own folder/photo view; there's no more "the" gallery for
// a client, only "a" gallery among possibly several.
export default async function ClientGalleriesPage({
  params,
}: {
  params: { id: string };
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
    .select('*, photos(count)')
    .eq('client_id', params.id)
    .order('created_at', { ascending: false });

  const galleryList = galleries ?? [];

  return (
    <div style={{ marginTop: 8 }}>
      {galleryList.length === 0 ? (
        <p style={{ color: '#888' }}>
          This client doesn't have a gallery yet — head to{' '}
          <Link href={`/admin/clients/${client.id}/upload`}>Upload</Link> to create one.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {galleryList.map((gallery) => {
            const photoCount = (gallery.photos as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <div
                key={gallery.id}
                style={{
                  border: '1px solid #eee',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0 }}>{gallery.title || 'Untitled gallery'}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
                    {photoCount} photo{photoCount === 1 ? '' : 's'}
                    {' · '}
                    {gallery.is_expired
                      ? 'Expired'
                      : gallery.expires_at
                        ? `Expires ${new Date(gallery.expires_at).toLocaleDateString()}`
                        : 'Never expires'}
                    {' · '}
                    Created {new Date(gallery.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <Link
                    href={`/admin/clients/${client.id}/upload/${gallery.id}`}
                    style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #ddd', borderRadius: 4 }}
                  >
                    Upload
                  </Link>
                  <Link
                    href={`/admin/clients/${client.id}/gallery/${gallery.id}`}
                    style={{ padding: '6px 12px', fontSize: 13, border: '1px solid #333', borderRadius: 4 }}
                  >
                    Manage photos →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 20 }}>
        <Link href={`/admin/clients/${client.id}/upload`} style={{ fontSize: 14 }}>
          + Create a new gallery
        </Link>
      </p>
    </div>
  );
}
