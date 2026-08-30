'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientInvite } from '@/lib/admin/invite-client';

// Updates a gallery's title and expiration from the Manage tab.
// Setting a new expires_at that's in the future — or clearing it to
// "never expires" — also clears is_expired, so extending an already-
// expired gallery's date immediately restores the client's access
// rather than leaving them locked out until the next cron run
// notices the date changed.
export async function updateGalleryDetailsAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const galleryId = formData.get('galleryId') as string;
  const title = (formData.get('title') as string)?.trim() || null;
  const neverExpires = formData.get('neverExpires') === 'on';
  const expiresAtInput = formData.get('expiresAt') as string;

  if (!galleryId) {
    redirect(`/admin/clients/${clientId}/gallery?error=${encodeURIComponent('Missing gallery.')}`);
  }

  let expiresAt: string | null = null;
  if (!neverExpires) {
    if (!expiresAtInput) {
      redirect(
        `/admin/clients/${clientId}/gallery/${galleryId}/manage?error=${encodeURIComponent(
          'Choose an expiration date, or check "Never expires."'
        )}`
      );
    }
    // Date input gives a bare yyyy-mm-dd with no time — treat it as
    // end-of-day so the gallery stays available through the whole day
    // the admin picked, not until midnight at the start of it.
    expiresAt = new Date(`${expiresAtInput}T23:59:59`).toISOString();
  }

  const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('galleries')
    .update({ title, expires_at: expiresAt, is_expired: isExpired })
    .eq('id', galleryId);

  if (error) {
    redirect(
      `/admin/clients/${clientId}/gallery/${galleryId}/manage?error=${encodeURIComponent(error.message)}`
    );
  }

  redirect(`/admin/clients/${clientId}/gallery/${galleryId}/manage?success=details_updated`);
}

// Grants an additional client read access to a gallery they don't own
// — a co-parent, grandparent, or anyone else who should see the
// photos without being the client the booking/invoices are under.
//
// If the email matches an existing client record, that client is
// reused as the viewer (no duplicate client rows for the same
// person). If not, a bare client record is created for them — same
// as any other client, just never attached to a booking of their own.
// Either way, if they don't yet have a login, this sends them the
// same invite email a new client gets, so "add viewer" is a single
// action that both grants access and lets them in.
export async function addGalleryViewerAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const galleryId = formData.get('galleryId') as string;
  const viewerName = (formData.get('viewerName') as string)?.trim();
  const viewerEmail = (formData.get('viewerEmail') as string)?.trim().toLowerCase();

  const manageUrl = `/admin/clients/${clientId}/gallery/${galleryId}/manage`;

  if (!galleryId || !viewerEmail) {
    redirect(`${manageUrl}?error=${encodeURIComponent('An email address is required.')}`);
  }

  const supabase = createAdminClient();

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .ilike('email', viewerEmail)
    .maybeSingle();

  let viewerClientId = existingClient?.id ?? null;

  if (!viewerClientId) {
    if (!viewerName) {
      redirect(
        `${manageUrl}?error=${encodeURIComponent(
          "That email isn't an existing client yet — enter their name too so a record can be created for them."
        )}`
      );
    }

    const { data: created, error: createError } = await supabase
      .from('clients')
      .insert({ full_name: viewerName, email: viewerEmail })
      .select('id')
      .single();

    if (createError || !created) {
      redirect(
        `${manageUrl}?error=${encodeURIComponent(createError?.message ?? 'Could not add viewer.')}`
      );
    }

    viewerClientId = created.id;
  }

  const { error: linkError } = await supabase
    .from('gallery_viewers')
    .insert({ gallery_id: galleryId, client_id: viewerClientId });

  if (linkError) {
    // Postgres unique-violation code — already a viewer on this
    // gallery. Not a real failure from the admin's point of view, so
    // this reads as informational rather than an error banner.
    if (linkError.code === '23505') {
      redirect(`${manageUrl}?success=viewer_already_added`);
    }
    redirect(`${manageUrl}?error=${encodeURIComponent(linkError.message)}`);
  }

  // Send them access if they don't already have a login. Failing to
  // send shouldn't block the grant itself — they're still added as a
  // viewer either way, and the admin can hit "Resend invite" from
  // here or the main client list.
  try {
    await sendClientInvite(viewerClientId);
  } catch {
    redirect(`${manageUrl}?success=viewer_added_no_invite`);
  }

  redirect(`${manageUrl}?success=viewer_added`);
}

// Revokes a viewer's access. Only removes the gallery_viewers link —
// never deletes the underlying client record, since that person may
// still be a real client with their own galleries elsewhere.
export async function removeGalleryViewerAction(formData: FormData) {
  const clientId = formData.get('clientId') as string;
  const galleryId = formData.get('galleryId') as string;
  const viewerClientId = formData.get('viewerClientId') as string;

  const manageUrl = `/admin/clients/${clientId}/gallery/${galleryId}/manage`;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('gallery_viewers')
    .delete()
    .eq('gallery_id', galleryId)
    .eq('client_id', viewerClientId);

  if (error) {
    redirect(`${manageUrl}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`${manageUrl}?success=viewer_removed`);
}
