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
    redirect(`/admin/clients/${clientId}/upload?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/upload?success=gallery_created`);
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

// Folders ("albums") group photos within one gallery — e.g. separating
// 50 reception family photos from the rest of the reception shots —
// so both browsing and zip downloads on the client side can be split
// the same way. sort_order is just the count of existing folders at
// creation time, so folders list in the order they were made unless
// deliberately reordered later.
export async function createFolderAction(formData: FormData) {
  const galleryId = formData.get('galleryId') as string;
  const clientId = formData.get('clientId') as string;
  const name = (formData.get('name') as string)?.trim();

  if (!galleryId || !name) {
    redirect(
      `/admin/clients/${clientId}/gallery?error=${encodeURIComponent('Folder name is required.')}`
    );
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from('photo_folders')
    .select('id', { count: 'exact', head: true })
    .eq('gallery_id', galleryId);

  const { error } = await supabase.from('photo_folders').insert({
    gallery_id: galleryId,
    name,
    sort_order: count ?? 0,
  });

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=folder_created`);
}

export async function renameFolderAction(formData: FormData) {
  const folderId = formData.get('folderId') as string;
  const clientId = formData.get('clientId') as string;
  const name = (formData.get('name') as string)?.trim();

  if (!folderId || !name) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent('Name is required.')}`);
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('photo_folders').update({ name }).eq('id', folderId);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=folder_renamed`);
}

// Deleting a folder never deletes photos — the folder_id foreign key
// is "on delete set null", so photos inside just become unsorted
// again. The folder is purely an organizational label.
export async function deleteFolderAction(formData: FormData) {
  const folderId = formData.get('folderId') as string;
  const clientId = formData.get('clientId') as string;

  const supabase = createAdminClient();
  const { error } = await supabase.from('photo_folders').delete().eq('id', folderId);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=folder_deleted`);
}

// Moves a single existing photo into a folder (or back to unsorted,
// when folderId is empty) — how a photo that was already uploaded
// gets sorted into an album after the fact.
export async function movePhotoToFolderAction(formData: FormData) {
  const photoId = formData.get('photoId') as string;
  const clientId = formData.get('clientId') as string;
  const folderId = (formData.get('folderId') as string) || null;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('photos')
    .update({ folder_id: folderId })
    .eq('id', photoId);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/clients/${clientId}/gallery?success=photo_moved`);
}

// Same idea as movePhotoToFolderAction, but for a checkbox-selected
// batch — this is the "select 50 reception photos, drop them in one
// folder in one move" path, rather than reassigning photos one at a
// time. folderId empty/omitted sends the whole selection back to
// unsorted.
export async function moveManyPhotosToFolderAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const folderId = (formData.get('folderId') as string) || null;
  const photoIds = formData.getAll('photoIds').map(String).filter(Boolean);

  if (photoIds.length === 0) {
    redirect(
      `/admin/clients/${clientId}/gallery?error=${encodeURIComponent(
        'Select at least one photo to move.'
      )}`
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('photos')
    .update({ folder_id: folderId })
    .in('id', photoIds);

  if (error) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/admin/clients/${clientId}/gallery?success=photos_moved&count=${photoIds.length}`
  );
}
