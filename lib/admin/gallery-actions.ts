'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

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
  // handling per-file simple.
  for (let i = 0; i < validFiles.length; i++) {
    const file = validFiles[i];
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${galleryId}/${Date.now()}-${i}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('galleries')
      .upload(storagePath, file, { contentType: file.type });

    if (uploadError) {
      errors.push(`${file.name}: ${uploadError.message}`);
      continue;
    }

    const { error: insertError } = await supabase.from('photos').insert({
      gallery_id: galleryId,
      storage_path: storagePath,
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
  const clientId = formData.get('clientId') as string;

  const supabase = createAdminClient();

  if (storagePath) {
    await supabase.storage.from('galleries').remove([storagePath]);
  }

  const { error } = await supabase.from('photos').delete().eq('id', photoId);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=photo_deleted`);
}
