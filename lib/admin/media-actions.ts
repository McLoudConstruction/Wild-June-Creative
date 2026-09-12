'use server';

import { createAdminClient } from '@/lib/supabase/admin';

// Resizing used to happen here, server-side, via sharp — download the
// raw upload, resize, re-upload, delete the staging copy. That meant
// two full-size transfers plus a server round trip for every upload.
// The browser now compresses the image itself before it ever leaves
// (see lib/site/image-compress.ts), so this just hands back a signed
// URL straight to the image's final location — one small upload,
// nothing to process afterward.
export async function getSignedMediaUploadUrl(fileName: string) {
  const supabase = createAdminClient();
  const safeBase = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${Date.now()}-${safeBase}.jpg`;

  const { data, error } = await supabase.storage.from('media-library').createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Couldn't prepare upload: ${error?.message ?? 'unknown error'}`);
  }

  const { data: publicUrlData } = supabase.storage.from('media-library').getPublicUrl(path);
  return { path: data.path, token: data.token, url: publicUrlData.publicUrl };
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
