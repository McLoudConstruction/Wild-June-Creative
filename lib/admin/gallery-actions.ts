'use server';

import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

// Every upload gets resized down and re-encoded before it ever
// touches storage — a DSLR or modern phone photo straight off the
// camera can be 15-40MB+; nothing about viewing it in a browser
// benefits from storing (or downloading) that much data.
//
// MAIN: a good display/download quality version — plenty for viewing
// full-screen or a client saving it, without being camera-original
// size.
// THUMBNAIL: a small, fast-loading version specifically for grid
// views, so browsing a gallery of 100+ photos doesn't mean pulling
// down 100+ multi-megabyte files just to show little squares.
const MAIN_MAX_DIMENSION = 2400;
const MAIN_QUALITY = 85;
const THUMBNAIL_MAX_DIMENSION = 500;
const THUMBNAIL_QUALITY = 80;

// Creates a gallery for a client with an expiration date computed
// from the number of days chosen in the form. is_expired starts
// false regardless — the daily cron job (check-gallery-expiration)
// is what flips it once expires_at actually passes.
export async function createGalleryAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const title = (formData.get('title') as string)?.trim() || null;
  const availabilityDays = parseInt((formData.get('availabilityDays') as string) || '30', 10);

  if (!clientId) {
    redirect(`/admin?error=${encodeURIComponent('Missing client.')}`);
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (Number.isFinite(availabilityDays) ? availabilityDays : 30));

  const supabase = createAdminClient();
  const { error } = await supabase.from('galleries').insert({
    client_id: clientId,
    title,
    published_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=gallery_created`);
}

// Uploads one or more photos to a gallery. Files come through the
// FormData as File objects — Next.js Server Actions handle multipart
// form submissions natively, no separate upload endpoint needed.
export async function uploadPhotosAction(formData: FormData) {
  const galleryId = formData.get('galleryId') as string;
  const clientId = formData.get('clientId') as string;
  const files = formData.getAll('photos') as File[];

  if (!galleryId) {
    redirect(`/admin?error=${encodeURIComponent('Missing gallery.')}`);
  }

  const validFiles = files.filter((f) => f instanceof File && f.size > 0);

  if (validFiles.length === 0) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent('No files selected.')}`);
  }

  const supabase = createAdminClient();
  const errors: string[] = [];

  // Sequential rather than parallel — plenty fast at the "a few dozen
  // photos per upload" scale this is built for, and keeps error
  // handling per-file simple. sharp is also memory-hungry per image,
  // so sequential processing avoids spiking memory on a large batch.
  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const safeBaseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathPrefix = `${galleryId}/${Date.now()}-${i}-${safeBaseName}`;

    let mainBuffer: Buffer;
    let thumbnailBuffer: Buffer;

    try {
      const originalBuffer = Buffer.from(await file.arrayBuffer());

      mainBuffer = await sharp(originalBuffer)
        .rotate() // applies EXIF orientation so photos don't end up sideways
        .resize({
          width: MAIN_MAX_DIMENSION,
          height: MAIN_MAX_DIMENSION,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: MAIN_QUALITY })
        .toBuffer();

      thumbnailBuffer = await sharp(originalBuffer)
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
      errors.push(
        `${file.name}: couldn't process this image (${
          err instanceof Error ? err.message : 'unknown error'
        }). Skipped.`
      );
      continue;
    }

    const mainPath = `${pathPrefix}.jpg`;
    const thumbnailPath = `${pathPrefix}-thumb.jpg`;

    const { error: mainUploadError } = await supabase.storage
      .from('galleries')
      .upload(mainPath, mainBuffer, { contentType: 'image/jpeg' });

    if (mainUploadError) {
      errors.push(`${file.name}: ${mainUploadError.message}`);
      continue;
    }

    const { error: thumbUploadError } = await supabase.storage
      .from('galleries')
      .upload(thumbnailPath, thumbnailBuffer, { contentType: 'image/jpeg' });

    if (thumbUploadError) {
      // Main image made it, thumbnail didn't — not worth failing the
      // whole upload over, the gallery UI falls back to the main
      // image if thumbnail_path is null.
      errors.push(`${file.name}: uploaded, but thumbnail failed (${thumbUploadError.message}).`);
    }

    const { error: insertError } = await supabase.from('photos').insert({
      gallery_id: galleryId,
      storage_path: mainPath,
      thumbnail_path: thumbUploadError ? null : thumbnailPath,
      file_name: file.name,
      sort_order: i,
    });

    if (insertError) {
      errors.push(`${file.name}: ${insertError.message}`);
    }
  }

  if (errors.length > 0) {
    redirect(
      `/admin/clients/${clientId}/gallery?error=${encodeURIComponent(
        `${errors.length} file(s) failed: ${errors.join('; ')}`
      )}`
    );
  }

  redirect(`/admin/clients/${clientId}/gallery?success=photos_uploaded`);
}

// Deletes a photo — both the storage object and the database row.
// Storage and database aren't linked by a cascade, so both need
// explicit cleanup or you'd end up with an orphaned file taking up
// space with nothing pointing to it.
export async function deletePhotoAction(formData: FormData) {
  const photoId = formData.get('photoId') as string;
  const storagePath = formData.get('storagePath') as string;
  const thumbnailPath = formData.get('thumbnailPath') as string | null;
  const clientId = formData.get('clientId') as string;

  const supabase = createAdminClient();

  const pathsToRemove = [storagePath, thumbnailPath].filter(Boolean) as string[];
  if (pathsToRemove.length > 0) {
    await supabase.storage.from('galleries').remove(pathsToRemove);
  }

  const { error } = await supabase.from('photos').delete().eq('id', photoId);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=photo_deleted`);
}
