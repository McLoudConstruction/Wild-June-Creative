import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateWatermarkSettingsAction } from '@/lib/admin/watermark-actions';

export const dynamic = 'force-dynamic';

export default async function WatermarkSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  noStore();
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from('watermark_settings')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  let previewUrl: string | null = null;
  if (settings?.storage_path) {
    const { data: signed } = await supabase.storage
      .from('galleries')
      .createSignedUrl(settings.storage_path, 3600);
    previewUrl = signed?.signedUrl ?? null;
  }

  return (
    <div style={{ maxWidth: 500 }}>
      <h1>Watermark settings</h1>
      <p style={{ color: '#666' }}>
        This controls what your watermark looks like and where it sits — whether it actually gets
        applied is a checkbox on the upload form each time, so you decide per-upload.
      </p>

      {searchParams.success && <p style={{ color: 'green' }}>Settings saved.</p>}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      {previewUrl && (
        <div style={{ margin: '16px 0' }}>
          <p style={{ fontSize: 14, color: '#666' }}>Current watermark:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Current watermark"
            style={{ maxWidth: 200, background: '#eee', padding: 8, borderRadius: 4 }}
          />
        </div>
      )}

      <form action={updateWatermarkSettingsAction}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="watermarkImage">
            {settings?.storage_path ? 'Replace watermark image' : 'Upload watermark image'}
          </label>
          <input
            id="watermarkImage"
            name="watermarkImage"
            type="file"
            accept="image/png"
            style={{ display: 'block', marginTop: 4 }}
          />
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            PNG with a transparent background works best.
          </p>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="position">Position</label>
          <select
            id="position"
            name="position"
            defaultValue={settings?.position ?? 'bottom-right'}
            style={{ width: '100%', padding: 8 }}
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
            <option value="center">Center</option>
          </select>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="opacityPercent">Opacity (%)</label>
          <input
            id="opacityPercent"
            name="opacityPercent"
            type="number"
            min={1}
            max={100}
            defaultValue={settings?.opacity_percent ?? 60}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="widthPercent">Size (% of photo width)</label>
          <input
            id="widthPercent"
            name="widthPercent"
            type="number"
            min={1}
            max={100}
            defaultValue={settings?.width_percent ?? 20}
            style={{ width: '100%', padding: 8 }}
          />
        </div>

        <button type="submit" style={{ padding: '8px 16px' }}>
          Save settings
        </button>
      </form>
    </div>
  );
}
