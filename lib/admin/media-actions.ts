'use server';

import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_DIMENSION = 2000;
const QUALITY = 85;

// Step 1 of a direct upload (mirrors lib/admin/settings-actions.ts) —
// signed URL so the file goes browser → Supabase directly, never
// through a Vercel function. See that file's comment for why: Vercel
// caps request bodies at 4.5MB regardless of any app-level config,
// and a real photo routinely exceeds that.
export async function getSignedMediaUploadUrl(fileName: string) {
  const supabase = createAdminClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stagingPath = `_incoming/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { data, error } = await supabase.storage.from('media-library').createSignedUploadUrl(stagingPath);

  if (error || !data) {
    throw new Error(`Couldn't prepare upload: ${error?.message ?? 'unknown error'}`);
  }

  return { path: data.path, token: data.token };
}

// Step 2 — resizes to a web-appropriate size and moves it into the
// library's flat namespace so listMediaLibrary() picks it up.
export async function processMediaUpload(
  stagingPath: string,
  fileName: string
): Promise<{ url?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data: rawFile, error: downloadError } = await supabase.storage
    .from('media-library')
    .download(stagingPath);

  if (downloadError || !rawFile) {
    return { error: `Couldn't read uploaded file: ${downloadError?.message ?? 'unknown error'}` };
  }

  let resized: Buffer;
  try {
    const buffer = Buffer.from(await rawFile.arrayBuffer());
    resized = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: QUALITY })
      .toBuffer();
  } catch (err) {
    await supabase.storage.from('media-library').remove([stagingPath]);
    return { error: `Couldn't process image: ${err instanceof Error ? err.message : 'unknown error'}` };
  }

  const safeBase = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalPath = `${Date.now()}-${safeBase}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('media-library')
    .upload(finalPath, resized, { contentType: 'image/jpeg' });

  await supabase.storage.from('media-library').remove([stagingPath]);

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from('media-library').getPublicUrl(finalPath);
  return { url: data.publicUrl };
}

export type MediaLibraryItem = { name: string; url: string };

// Browsing tab of the picker — everything already uploaded to the
// library, newest first.
export async function listMediaLibrary(): Promise<MediaLibraryItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage.from('media-library').list('', {
    limit: 200,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error || !data) {
    return [];
  }

  return data
    .filter((item) => item.id) // real files only, not the staging folder placeholder
    .map((item) => ({
      name: item.name,
      url: supabase.storage.from('media-library').getPublicUrl(item.name).data.publicUrl,
    }));
}

export type GalleryOption = { id: string; label: string };

// "From a gallery" tab, step 1 — pick which client gallery to browse.
export async function listGalleriesForPicker(): Promise<GalleryOption[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('galleries')
    .select('id, title, created_at, clients(full_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const clientName = Array.isArray(row.clients)
      ? row.clients[0]?.full_name
      : (row.clients as { full_name: string } | null)?.full_name;
    const label = [clientName, row.title].filter(Boolean).join(' — ') || 'Untitled gallery';
    return { id: row.id as string, label };
  });
}

export type GalleryPhotoOption = {
  id: string;
  thumbnailUrl: string;
  isWatermarked: boolean;
};

// "From a gallery" tab, step 2 — thumbnails for the chosen gallery.
// The galleries bucket is private, so these are short-lived signed
// URLs, fine since they're only ever used inside this picker session
// rather than stored anywhere.
export async function listGalleryPhotosForPicker(galleryId: string): Promise<GalleryPhotoOption[]> {
  const supabase = createAdminClient();

  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, thumbnail_path, storage_path, is_watermarked')
    .eq('gallery_id', galleryId)
    .order('sort_order', { ascending: true });

  if (error || !photos) {
    return [];
  }

  const results: GalleryPhotoOption[] = [];
  for (const photo of photos) {
    const path = photo.thumbnail_path ?? photo.storage_path;
    const { data: signed } = await supabase.storage.from('galleries').createSignedUrl(path, 300);
    if (signed?.signedUrl) {
      results.push({ id: photo.id, thumbnailUrl: signed.signedUrl, isWatermarked: photo.is_watermarked });
    }
  }
  return results;
}

// "From a gallery" tab, step 3 — copies the chosen photo's
// web-resolution version (not the near-lossless original, which is
// far larger than website content needs) into the public
// media-library bucket and returns its new, permanent public URL.
// Copied rather than referenced so this keeps working even if the
// source gallery later expires or is deleted.
export async function copyGalleryPhotoToMediaLibrary(
  photoId: string
): Promise<{ url?: string; isWatermarked?: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { data: photo, error: photoError } = await supabase
    .from('photos')
    .select('storage_path, file_name, is_watermarked')
    .eq('id', photoId)
    .maybeSingle();

  if (photoError || !photo) {
    return { error: `Couldn't find that photo: ${photoError?.message ?? 'not found'}` };
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from('galleries')
    .download(photo.storage_path);

  if (downloadError || !fileData) {
    return { error: `Couldn't read the photo: ${downloadError?.message ?? 'unknown error'}` };
  }

  const buffer = Buffer.from(await fileData.arrayBuffer());
  const safeBase = photo.file_name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalPath = `${Date.now()}-${safeBase}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from('media-library')
    .upload(finalPath, buffer, { contentType: 'image/jpeg' });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrlData } = supabase.storage.from('media-library').getPublicUrl(finalPath);
  return { url: publicUrlData.publicUrl, isWatermarked: photo.is_watermarked };
}
