import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWatermarkSettings } from '@/lib/admin/watermark';
import { GalleryUploader } from '@/components/GalleryUploader';

export const dynamic = 'force-dynamic';
// Gives the per-photo processing action (compress + watermark +
// thumbnail) real headroom — a large original can take a few seconds
// through sharp, and this page is where that action gets invoked
// from.
export const maxDuration = 60;

export default async function ClientGalleryUploadPage({
  params,
  searchParams,
}: {
  params: { id: string; galleryId: string };
  searchParams: { error?: string; success?: string };
}) {
  noStore();
  const supabase = createAdminClient();

  // The shell layout already confirmed this gallery exists and
  // belongs to this client.
  const { data: gallery } = await supabase
    .from('galleries')
    .select('*')
    .eq('id', params.galleryId)
    .eq('client_id', params.id)
    .maybeSingle();

  if (!gallery) {
    notFound();
  }

  const watermarkSettings = await getWatermarkSettings();
  const watermarkConfigured = Boolean(watermarkSettings?.storage_path);

  const { data: folders } = await supabase
    .from('photo_folders')
    .select('*')
    .eq('gallery_id', gallery.id)
    .order('sort_order', { ascending: true });

  return (
    <div style={{ marginTop: 16 }}>
      {searchParams.success === 'gallery_created' && (
        <p style={{ color: 'green' }}>
          Gallery created. Upload photos below whenever you're ready.
        </p>
      )}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <GalleryUploader
        galleryId={gallery.id}
        watermarkConfigured={watermarkConfigured}
        folders={folders ?? []}
      />
    </div>
  );
}
