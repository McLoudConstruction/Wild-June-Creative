import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { GalleryViewer } from '@/components/GalleryViewer';

export const dynamic = 'force-dynamic';

export default async function GalleryPage({ params }: { params: { id: string } }) {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // RLS scopes this to galleries the logged-in client actually owns —
  // a client can't view this page for someone else's gallery just by
  // guessing/changing the ID in the URL.
  const { data: gallery } = await supabase
    .from('galleries')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!gallery) {
    notFound();
  }

  // Expiration is enforced here, at the application level, rather
  // than by hiding the row via RLS — that's what lets a client land
  // on a clear "this has expired" explanation instead of a bare 404
  // once their access window closes.
  if (gallery.is_expired) {
    return (
      <div style={{ maxWidth: 500, margin: '64px auto', padding: '0 16px', textAlign: 'center' }}>
        <h1>This gallery has expired</h1>
        <p style={{ color: '#666' }}>
          This gallery is no longer available online. If you'd like it reactivated or have any
          questions, reach out and we'll be happy to help.
        </p>
        <p style={{ marginTop: 24 }}>
          <a href="mailto:bookings@wildjunecreative.com">Contact us</a>
        </p>
      </div>
    );
  }

  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .eq('gallery_id', gallery.id)
    .order('sort_order', { ascending: true });

  const { data: folders } = await supabase
    .from('photo_folders')
    .select('*')
    .eq('gallery_id', gallery.id)
    .order('sort_order', { ascending: true });

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: fullSigned } = await supabase.storage
        .from('galleries')
        .createSignedUrl(photo.storage_path, 3600);

      const { data: thumbSigned } = photo.thumbnail_path
        ? await supabase.storage.from('galleries').createSignedUrl(photo.thumbnail_path, 3600)
        : { data: null };

      const { data: originalSigned } = photo.original_path
        ? await supabase.storage.from('galleries').createSignedUrl(photo.original_path, 3600)
        : { data: null };

      const baseName = photo.file_name.replace(/\.[^.]+$/, '');

      return {
        ...photo,
        fullUrl: fullSigned?.signedUrl ?? null,
        // Grid always has something to show even if the thumbnail is
        // missing for some reason (e.g. it failed to generate at
        // upload time) — just falls back to the full image.
        gridUrl: thumbSigned?.signedUrl ?? fullSigned?.signedUrl ?? null,
        // Full resolution falls back to the web version if an
        // original somehow wasn't generated (e.g. photos uploaded
        // before this feature existed) — still better than a dead
        // button.
        downloadWebUrl: fullSigned?.signedUrl ?? null,
        downloadWebFilename: `${baseName}-web.jpg`,
        downloadOriginalUrl: originalSigned?.signedUrl ?? fullSigned?.signedUrl ?? null,
        downloadOriginalFilename: `${baseName}-full-res.jpg`,
      };
    })
  );

  const gallerySlug = (gallery.title || 'gallery')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

  // Photos in a named folder become their own "album" section (with
  // its own pre-named, size-split zip download); anything without a
  // folder falls into a single "Photos" bucket so it still shows up
  // rather than disappearing.
  const albums = [
    ...(folders ?? []).map((folder) => ({
      id: folder.id,
      name: folder.name,
      slug: slugify(folder.name),
      photos: photosWithUrls.filter((p) => p.folder_id === folder.id),
    })),
    {
      id: 'unsorted',
      name: (folders ?? []).length > 0 ? 'More photos' : 'Photos',
      slug: 'photos',
      photos: photosWithUrls.filter((p) => !p.folder_id),
    },
  ].filter((album) => album.photos.length > 0);

  return (
    <div style={{ maxWidth: 1180, margin: '40px auto', padding: '0 32px' }}>
      <h1>{gallery.title || 'Your gallery'}</h1>
      {gallery.expires_at && (
        <p style={{ color: '#666' }}>
          Available until {new Date(gallery.expires_at).toLocaleDateString()} — tap the star to
          favorite a photo, tap a photo to view it full size, or use the download buttons on each
          photo (or above the grid) to save it.
        </p>
      )}

      {photosWithUrls.length === 0 ? (
        <p style={{ color: '#888', marginTop: 24 }}>
          Photos haven't been added to this gallery yet — check back soon.
        </p>
      ) : (
        <div style={{ marginTop: 24 }}>
          <GalleryViewer albums={albums} gallerySlug={gallerySlug} />
        </div>
      )}
    </div>
  );
}
