import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { FavoriteButton } from '@/components/FavoriteButton';

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
      <div style={{ maxWidth: 500, margin: '120px auto', padding: '0 16px', textAlign: 'center' }}>
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

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: signed } = await supabase.storage
        .from('galleries')
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, url: signed?.signedUrl ?? null };
    })
  );

  return (
    <div style={{ maxWidth: 1000, margin: '60px auto', padding: '0 16px' }}>
      <h1>{gallery.title || 'Your gallery'}</h1>
      {gallery.expires_at && (
        <p style={{ color: '#666' }}>
          Available until {new Date(gallery.expires_at).toLocaleDateString()} — tap the star to
          favorite a photo, tap a photo to view it full size.
        </p>
      )}

      {photosWithUrls.length === 0 ? (
        <p style={{ color: '#888', marginTop: 24 }}>
          Photos haven't been added to this gallery yet — check back soon.
        </p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12,
            marginTop: 24,
          }}
        >
          {photosWithUrls.map((photo) =>
            photo.url ? (
              <div key={photo.id} style={{ position: 'relative' }}>
                <a href={photo.url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt={photo.file_name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      borderRadius: 6,
                      display: 'block',
                    }}
                  />
                </a>
                <FavoriteButton photoId={photo.id} initialFavorite={photo.is_favorite} />
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
