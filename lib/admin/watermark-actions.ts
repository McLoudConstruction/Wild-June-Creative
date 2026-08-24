'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export async function updateWatermarkSettingsAction(formData: FormData) {
  const position = formData.get('position') as string;
  const opacityPercent = parseInt((formData.get('opacityPercent') as string) || '60', 10);
  const widthPercent = parseInt((formData.get('widthPercent') as string) || '20', 10);
  const watermarkFile = formData.get('watermarkImage') as File | null;

  const supabase = createAdminClient();

  let storagePath: string | undefined;

  // The watermark image itself is optional on any given save — only
  // replace it if a new file was actually chosen, otherwise keep
  // whatever's already configured.
  if (watermarkFile && watermarkFile.size > 0) {
    const buffer = Buffer.from(await watermarkFile.arrayBuffer());
    storagePath = `_watermark/logo-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('galleries')
      .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

    if (uploadError) {
      redirect(
        `/admin/settings/watermark?error=${encodeURIComponent(
          `Failed to upload watermark image: ${uploadError.message}`
        )}`
      );
    }
  }

  const updatePayload: Record<string, unknown> = {
    id: SETTINGS_ID,
    position,
    opacity_percent: Number.isFinite(opacityPercent) ? opacityPercent : 60,
    width_percent: Number.isFinite(widthPercent) ? widthPercent : 20,
    updated_at: new Date().toISOString(),
  };

  if (storagePath) {
    updatePayload.storage_path = storagePath;
  }

  const { error } = await supabase.from('watermark_settings').upsert(updatePayload);

  if (error) {
    redirect(`/admin/settings/watermark?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin/settings/watermark?success=1');
}
