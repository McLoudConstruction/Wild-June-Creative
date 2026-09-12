import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateWatermarkSettingsAction } from '@/lib/admin/watermark-actions';
import { SubmitButton } from '@/components/admin/SubmitButton';

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

      {searchParams.success && (
        <div
          style={{
            background: '#e6f4ea',
            border: '1px solid #34a853',
            color: '#1e7e34',
            padding: '12px 16px',
            borderRadius: 6,
            margin: '16px 0',
            fontSize: 14,
          }}
        >
          ✓ Settings saved.
        </div>
      )}
      {searchParams.error && (
        <div
          style={{
            background: '#fdecea',
            border: '1px solid crimson',
            color: 'crimson',
            padding: '12px 16px',
            borderRadius: 6,
            margin: '16px 0',
            fontSize: 14,
          }}
        >
          {decodeURIComponent(searchParams.error)}
        </div>
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

        <SubmitButton />
      </form>
    </div>
  );
}
