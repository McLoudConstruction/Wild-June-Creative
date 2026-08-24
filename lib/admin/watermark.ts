import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

export type WatermarkSettings = {
  storage_path: string | null;
  position: string;
  opacity_percent: number;
  width_percent: number;
};

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export async function getWatermarkSettings(): Promise<WatermarkSettings | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('watermark_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .maybeSingle();

  return data;
}

const GRAVITY_MAP: Record<string, string> = {
  'top-left': 'northwest',
  'top-right': 'northeast',
  'bottom-left': 'southwest',
  'bottom-right': 'southeast',
  center: 'center',
};

// Composites the configured watermark onto a full-resolution image
// buffer. Called once on the original, before it gets resized down
// into the main/thumbnail versions — that way the watermark scales
// down proportionally along with everything else, rather than needing
// to be positioned separately for each output size.
export async function applyWatermarkToImage(
  imageBuffer: Uint8Array,
  watermarkBuffer: Uint8Array,
  settings: WatermarkSettings
): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const targetWidth = Math.max(
    1,
    Math.round((metadata.width ?? 1000) * (settings.width_percent / 100))
  );

  let watermark = sharp(watermarkBuffer)
    .resize({ width: targetWidth })
    .ensureAlpha();

  // Sharp doesn't have a direct "opacity" option on composite, so
  // reducing opacity means multiplying the watermark's own alpha
  // channel down using a 1x1 tiled overlay with 'dest-in' blending —
  // the standard trick for this with sharp.
  if (settings.opacity_percent < 100) {
    const alphaLevel = Math.round((settings.opacity_percent / 100) * 255);
    watermark = watermark.composite([
      {
        input: Buffer.from([255, 255, 255, alphaLevel]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      },
    ]);
  }

  const watermarkBufferFinal = await watermark.png().toBuffer();
  const gravity = GRAVITY_MAP[settings.position] ?? 'southeast';

  return image
    .composite([{ input: watermarkBufferFinal, gravity: gravity as any }])
    .toBuffer();
}
