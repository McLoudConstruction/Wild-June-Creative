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

// Deletes a photo — both the storage object and the database row.
// Storage and database aren't linked by a cascade, so both need
// explicit cleanup or you'd end up with an orphaned file taking up
// space with nothing pointing to it.
//
// Photo uploads themselves now go through lib/admin/upload-actions.ts
// (getSignedUploadUrl + processStagedPhoto) instead of a single-batch
// action here — that split is what makes uploading 200 photos at once
// actually reliable, since raw file bytes go browser-to-storage
// directly rather than through a single Vercel function invocation
// that would hit request size and execution time limits well before
// reaching photo #10.
export async function deletePhotoAction(formData: FormData) {
  const photoId = formData.get('photoId') as string;
  const storagePath = formData.get('storagePath') as string;
  const thumbnailPath = formData.get('thumbnailPath') as string | null;
  const originalPath = formData.get('originalPath') as string | null;
  const clientId = formData.get('clientId') as string;

  const supabase = createAdminClient();

  const pathsToRemove = [storagePath, thumbnailPath, originalPath].filter(Boolean) as string[];
  if (pathsToRemove.length > 0) {
    await supabase.storage.from('galleries').remove(pathsToRemove);
  }

  const { error } = await supabase.from('photos').delete().eq('id', photoId);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=photo_deleted`);
}
