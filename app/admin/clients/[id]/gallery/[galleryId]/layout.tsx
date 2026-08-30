import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { GallerySubNav } from '@/components/admin/GallerySubNav';

export default async function GalleryShellLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string; galleryId: string };
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

  return (
    <div>
      <p style={{ fontSize: 13, marginBottom: 4 }}>
        <Link href={`/admin/clients/${params.id}/gallery`}>← All galleries</Link>
      </p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>{gallery.title || 'Untitled gallery'}</h3>
        <span style={{ fontSize: 13, color: '#888' }}>
          {gallery.is_expired
            ? 'Expired'
            : gallery.expires_at
              ? `Expires ${new Date(gallery.expires_at).toLocaleDateString()}`
              : 'Never expires'}
        </span>
      </div>

      <GallerySubNav clientId={params.id} galleryId={params.galleryId} />

      {children}
    </div>
  );
}
