'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FavoriteButton } from '@/components/FavoriteButton';
import { DownloadButton } from '@/components/DownloadButton';
import { DownloadAllButton } from '@/components/DownloadAllButton';

type PhotoItem = {
  id: string;
  file_name: string;
  is_favorite: boolean;
  gridUrl: string | null;
  fullUrl: string | null;
  downloadWebUrl: string | null;
  downloadWebFilename: string;
  downloadOriginalUrl: string | null;
  downloadOriginalFilename: string;
};

type Album = {
  id: string;
  name: string;
  slug: string;
  photos: PhotoItem[];
};

// A single open-photo position: which album, which photo within it.
// Keeping both means arrow navigation stays scoped to the album the
// client opened — flipping through "Reception - Dancing" never spills
// into "Ceremony" photos.
type ViewerState = { albumIndex: number; photoIndex: number };

export function GalleryViewer({ albums, gallerySlug }: { albums: Album[]; gallerySlug: string }) {
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  const close = useCallback(() => setViewer(null), []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setViewer((current) => {
        if (!current) return current;
        const photos = albums[current.albumIndex]?.photos ?? [];
        if (photos.length === 0) return current;
        const nextIndex = (current.photoIndex + direction + photos.length) % photos.length;
        return { albumIndex: current.albumIndex, photoIndex: nextIndex };
      });
    },
    [albums]
  );

  // Keyboard navigation only listens while the viewer is actually
  // open — otherwise arrow keys elsewhere on the page would hijack
  // scrolling or form inputs.
  useEffect(() => {
    if (!viewer) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Escape') close();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewer, step, close]);

  // Lock page scroll behind the full-screen viewer so swiping/arrowing
  // through photos doesn't also scroll the gallery grid underneath.
  useEffect(() => {
    if (!viewer) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewer]);

  const activeAlbum = viewer ? albums[viewer.albumIndex] : null;
  const activePhoto = activeAlbum ? activeAlbum.photos[viewer!.photoIndex] : null;

  return (
    <>
      {albums.map((album, albumIndex) => (
        <div key={album.id} style={{ marginTop: 32 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <h2 style={{ fontSize: 20 }}>
              {album.name} <span style={{ color: '#999', fontSize: 14 }}>({album.photos.length})</span>
            </h2>
            {album.photos.length > 1 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <DownloadAllButton
                  items={album.photos
                    .filter((p) => p.downloadWebUrl)
                    .map((p) => ({ url: p.downloadWebUrl as string, filename: p.downloadWebFilename }))}
                  label="Download album (web size)"
                  baseFilename={`${gallerySlug}-${album.slug}-web`}
                />
                <DownloadAllButton
                  items={album.photos
                    .filter((p) => p.downloadOriginalUrl)
                    .map((p) => ({
                      url: p.downloadOriginalUrl as string,
                      filename: p.downloadOriginalFilename,
                    }))}
                  label="Download album (full resolution)"
                  baseFilename={`${gallerySlug}-${album.slug}-full-res`}
                />
              </div>
            )}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            {album.photos.map((photo, photoIndex) =>
              photo.gridUrl ? (
                <div key={photo.id} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setViewer({ albumIndex, photoIndex })}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: 0,
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                    }}
                    aria-label={`View ${photo.file_name} full size`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.gridUrl}
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
                  </button>
                  <FavoriteButton photoId={photo.id} initialFavorite={photo.is_favorite} />
                  <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 4 }}>
                    {photo.downloadWebUrl && (
                      <DownloadButton
                        url={photo.downloadWebUrl}
                        filename={photo.downloadWebFilename}
                        label="Web"
                      />
                    )}
                    {photo.downloadOriginalUrl && (
                      <DownloadButton
                        url={photo.downloadOriginalUrl}
                        filename={photo.downloadOriginalFilename}
                        label="Full res"
                      />
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      ))}

      {activeAlbum && activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo viewer — ${activeAlbum.name}`}
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(20, 17, 12, 0.94)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top bar: album name, position counter, close */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              color: '#f2ebe2',
              fontSize: 13,
              letterSpacing: '0.04em',
            }}
          >
            <span>
              {activeAlbum.name} — {viewer!.photoIndex + 1} of {activeAlbum.photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close photo viewer"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '50%',
                width: 36,
                height: 36,
                color: '#f2ebe2',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Main stage: prev arrow, image, next arrow */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: '0 12px',
              minHeight: 0,
            }}
          >
            {activeAlbum.photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
                style={arrowButtonStyle}
              >
                <ChevronLeft size={26} />
              </button>
            )}

            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                flex: 1,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={activePhoto.id}
                src={activePhoto.fullUrl ?? activePhoto.gridUrl ?? ''}
                alt={activePhoto.file_name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: 4,
                }}
              />
              <div style={{ position: 'absolute', top: 8, left: 8 }}>
                <FavoriteButton photoId={activePhoto.id} initialFavorite={activePhoto.is_favorite} />
              </div>
            </div>

            {activeAlbum.photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
                style={arrowButtonStyle}
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {/* Bottom bar: per-photo downloads */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 10,
              padding: '16px 20px 24px',
            }}
          >
            {activePhoto.downloadWebUrl && (
              <DownloadButton
                url={activePhoto.downloadWebUrl}
                filename={activePhoto.downloadWebFilename}
                label="Download web size"
              />
            )}
            {activePhoto.downloadOriginalUrl && (
              <DownloadButton
                url={activePhoto.downloadOriginalUrl}
                filename={activePhoto.downloadOriginalFilename}
                label="Download full resolution"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

const arrowButtonStyle: CSSProperties = {
  flexShrink: 0,
  background: 'rgba(255,255,255,0.1)',
  border: 'none',
  borderRadius: '50%',
  width: 48,
  height: 48,
  color: '#f2ebe2',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
