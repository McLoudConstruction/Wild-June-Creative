'use server';

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';
import { getWatermarkSettings, applyWatermarkToImage } from '@/lib/admin/watermark';

const MAIN_MAX_DIMENSION = 2400;
const MAIN_QUALITY = 85;
const THUMBNAIL_MAX_DIMENSION = 500;
const THUMBNAIL_QUALITY = 80;
const ORIGINAL_QUALITY = 95;

// Step 1 — called once per file, before any bytes move. Returns a
// short-lived signed upload token that lets the browser push the raw
// file straight to Supabase Storage, completely bypassing our own
// server for the transfer. This is what makes 200 full-resolution
// photos actually viable: a batch that size would blow past Vercel's
// request size and execution time limits if it ever tried to pass
// through a single server-side upload handler.
export async function getSignedUploadUrl(galleryId: string, fileName: string) {
  const supabase = createAdminClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stagingPath = `_incoming/${galleryId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  const { data, error } = await supabase.storage
    .from('galleries')
    .createSignedUploadUrl(stagingPath);

  if (error || !data) {
    throw new Error(`Couldn't prepare upload: ${error?.message ?? 'unknown error'}`);
  }

  return { path: data.path, token: data.token };
}

// Step 2 — called once per file, right after the browser finishes
// uploading its raw bytes to the staging path above. This is where
// compression, watermarking, and thumbnail generation actually
// happen — same processing as before, just triggered per-photo
// instead of as one giant batch. The payload here is tiny (just a
// path string), regardless of how large the original photo was, so
// it never runs into request size limits.
export async function processStagedPhoto({
  galleryId,
  stagingPath,
  fileName,
  applyWatermark,
  sortOrder,
}: {
  galleryId: string;
  stagingPath: string;
  fileName: string;
  applyWatermark: boolean;
  sortOrder: number;
}): Promise<{ success: boolean; error?: string; isWatermarked: boolean }> {
  const supabase = createAdminClient();

  const { data: rawFile, error: downloadError } = await supabase.storage
    .from('galleries')
    .download(stagingPath);

  if (downloadError || !rawFile) {
    return {
      success: false,
      error: `Couldn't read uploaded file: ${downloadError?.message ?? 'unknown error'}`,
      isWatermarked: false,
    };
  }

  const originalBuffer = Buffer.from(await rawFile.arrayBuffer());
  let sourceBuffer: Uint8Array = originalBuffer;
  let watermarkApplied = false;

  if (applyWatermark) {
    const settings = await getWatermarkSettings();
    if (settings?.storage_path) {
      try {
        const { data: watermarkFile, error: wmFetchError } = await supabase.storage
          .from('galleries')
          .download(settings.storage_path);

        if (!wmFetchError && watermarkFile) {
          const watermarkBuffer = Buffer.from(await watermarkFile.arrayBuffer());
          sourceBuffer = await applyWatermarkToImage(originalBuffer, watermarkBuffer, settings);
          watermarkApplied = true;
        }
      } catch {
        // Watermark failed — proceed without it rather than failing
        // the whole upload over a logo compositing issue.
      }
    }
  }

  let mainBuffer: Buffer;
  let thumbnailBuffer: Buffer;
  let originalQualityBuffer: Buffer;

  try {
    // Full resolution — same pixel dimensions as what was uploaded
    // (no resize), re-encoded at near-lossless quality. This is what
    // "full resolution" download in the portal actually serves.
    // Built from sourceBuffer (post-watermark, if one was applied) so
    // a watermarked photo can't be bypassed just by choosing the
    // higher-quality download option.
    originalQualityBuffer = await sharp(sourceBuffer)
      .rotate()
      .jpeg({ quality: ORIGINAL_QUALITY })
      .toBuffer();

    mainBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize({
        width: MAIN_MAX_DIMENSION,
        height: MAIN_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: MAIN_QUALITY })
      .toBuffer();

    thumbnailBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize({
        width: THUMBNAIL_MAX_DIMENSION,
        height: THUMBNAIL_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
  } catch (err) {
    await supabase.storage.from('galleries').remove([stagingPath]);
    return {
      success: false,
      error: `Couldn't process image: ${err instanceof Error ? err.message : 'unknown error'}`,
      isWatermarked: false,
    };
  }

  const safeBase = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const pathPrefix = `${galleryId}/${Date.now()}-${sortOrder}-${safeBase}`;
  const mainPath = `${pathPrefix}.jpg`;
  const thumbnailPath = `${pathPrefix}-thumb.jpg`;
  const originalPath = `${pathPrefix}-original.jpg`;

  const { error: mainUploadError } = await supabase.storage
    .from('galleries')
    .upload(mainPath, mainBuffer, { contentType: 'image/jpeg' });

  if (mainUploadError) {
    await supabase.storage.from('galleries').remove([stagingPath]);
    return { success: false, error: mainUploadError.message, isWatermarked: false };
  }

  const { error: thumbUploadError } = await supabase.storage
    .from('galleries')
    .upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/jpeg' });

  const { error: originalUploadError } = await supabase.storage
    .from('galleries')
    .upload(originalPath, originalQualityBuffer, { contentType: 'image/jpeg' });

  const { error: insertError } = await supabase.from('photos').insert({
    gallery_id: galleryId,
    storage_path: mainPath,
    thumbnail_path: thumbUploadError ? null : thumbnailPath,
    original_path: originalUploadError ? null : originalPath,
    file_name: fileName,
    sort_order: sortOrder,
    is_watermarked: watermarkApplied,
  });

  // Staging file gets cleaned up regardless of outcome from here —
  // either it's been fully turned into its final form, or whatever
  // failed wasn't the raw file's fault.
  await supabase.storage.from('galleries').remove([stagingPath]);

  if (insertError) {
    return { success: false, error: insertError.message, isWatermarked: watermarkApplied };
  }

  return { success: true, isWatermarked: watermarkApplied };
}
