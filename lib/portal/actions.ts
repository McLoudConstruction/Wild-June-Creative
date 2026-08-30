'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Uses the RLS-scoped server client, not the admin client — this
// isn't just a convenience, it's the actual security boundary. The
// "Clients can favorite photos in their own galleries" policy on the
// photos table is what stops a client from favoriting (or discovering
// the existence of) another client's photos by guessing an ID, since
// this runs as their session, not as an all-access admin.
export async function toggleFavoriteAction(formData: FormData) {
  const photoId = formData.get('photoId') as string;
  const nextFavorite = formData.get('nextFavorite') === 'true';

  if (!photoId) return;

  const supabase = await createClient();

  await supabase.from('photos').update({ is_favorite: nextFavorite }).eq('id', photoId);

  revalidatePath('/portal', 'layout');
}

// Signs the current client out and sends them back to the public
// homepage. Called from the "Log out" link in the site header, which
// renders anywhere Header does (main site, portal, login) once a
// client is signed in.
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
