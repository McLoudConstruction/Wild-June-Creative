'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, X, Images, Star, Folder } from 'lucide-react';
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

export function GalleryViewer({ albums, gallerySlug }: { albums: Album[]; gallerySlug: string }) {
  // Sidebar entries: "All Photos" (every folder combined) and
  // "Favorites" are always present regardless of what the admin has
  // set up — Favorites in particular is client-driven, not
  // admin-managed, so it starts empty and only fills in as the client
  // taps the star on photos they like. The real, admin-created
  // folders follow after those two.
  const sidebarAlbums = useMemo<Album[]>(() => {
    const allPhotos = albums.flatMap((a) => a.photos);
    const favoritePhotos = allPhotos.filter((p) => p.is_favorite);
    return [
      { id: 'all', name: 'All Photos', slug: 'all', photos: allPhotos },
      { id: 'favorites', name: 'Favorites', slug: 'favorites', photos: favoritePhotos },
      ...albums,
    ];
  }, [albums]);

  const [selectedId, setSelectedId] = useState('all');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const selectedAlbum = sidebarAlbums.find((a) => a.id === selectedId) ?? sidebarAlbums[0];

  // If the currently-viewed album's photo count shrinks out from
  // under the open lightbox (e.g. unfavoriting the photo you're
  // looking at while viewing Favorites), keep the index in bounds
  // instead of pointing past the end of the array — or close the
  // viewer entirely if nothing's left.
  useEffect(() => {
    if (openIndex === null) return;
    if (selectedAlbum.photos.length === 0) {
      setOpenIndex(null);
    } else if (openIndex >= selectedAlbum.photos.length) {
      setOpenIndex(selectedAlbum.photos.length - 1);
    }
  }, [selectedAlbum.photos.length, openIndex]);

  function selectAlbum(id: string) {
    setSelectedId(id);
    setOpenIndex(null);
  }

  const close = useCallback(() => setOpenIndex(null), []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenIndex((current) => {
        if (current === null) return current;
        const count = selectedAlbum.photos.length;
        if (count === 0) return current;
        return (current + direction + count) % count;
      });
    },
    [selectedAlbum.photos.length]
  );

  // Keyboard navigation only listens while the viewer is actually
  // open — otherwise arrow keys elsewhere on the page would hijack
  // scrolling or form inputs.
  useEffect(() => {
    if (openIndex === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Escape') close();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openIndex, step, close]);

  // Lock page scroll behind the full-screen viewer so swiping/arrowing
  // through photos doesn't also scroll the gallery grid underneath.
  useEffect(() => {
    if (openIndex === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex]);

  const activePhoto = openIndex !== null ? selectedAlbum.photos[openIndex] : null;

  return (
    <div className="portal-gallery-shell">
      <aside className="portal-sidebar">
        <p className="portal-sidebar-heading">Albums</p>
        <ul className="portal-sidebar-list">
          {sidebarAlbums.map((album) => {
            const Icon = album.id === 'all' ? Images : album.id === 'favorites' ? Star : Folder;
            return (
              <li key={album.id}>
                <button
                  type="button"
                  onClick={() => selectAlbum(album.id)}
                  className={`portal-sidebar-link${selectedId === album.id ? ' active' : ''}`}
                >
                  <Icon size={15} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {album.name}
                  </span>
                  <span className="portal-sidebar-count">{album.photos.length}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div style={{ flex: 1, minWidth: 0 }}>
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
            {selectedAlbum.name}{' '}
            <span style={{ color: '#999', fontSize: 14 }}>({selectedAlbum.photos.length})</span>
          </h2>
          {selectedAlbum.photos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <DownloadAllButton
                icon="web"
                items={selectedAlbum.photos
                  .filter((p) => p.downloadWebUrl)
                  .map((p) => ({ url: p.downloadWebUrl as string, filename: p.downloadWebFilename }))}
                label="Download (web size)"
                baseFilename={`${gallerySlug}-${selectedAlbum.slug}-web`}
              />
              <DownloadAllButton
                icon="full"
                items={selectedAlbum.photos
                  .filter((p) => p.downloadOriginalUrl)
                  .map((p) => ({
                    url: p.downloadOriginalUrl as string,
                    filename: p.downloadOriginalFilename,
                  }))}
                label="Download (full resolution)"
                baseFilename={`${gallerySlug}-${selectedAlbum.slug}-full-res`}
              />
            </div>
          )}
        </div>

        {selectedAlbum.photos.length === 0 ? (
          <p style={{ color: '#888', marginTop: 24 }}>
            {selectedAlbum.id === 'favorites'
              ? 'No favorites yet — tap the star on any photo to add it here.'
              : 'No photos here yet.'}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
              marginTop: 16,
            }}
          >
            {selectedAlbum.photos.map((photo, photoIndex) =>
              photo.gridUrl ? (
                <div key={photo.id} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setOpenIndex(photoIndex)}
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
                        icon="web"
                        url={photo.downloadWebUrl}
                        filename={photo.downloadWebFilename}
                        label="Web"
                      />
                    )}
                    {photo.downloadOriginalUrl && (
                      <DownloadButton
                        icon="full"
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
        )}
      </div>

      {activePhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo viewer — ${selectedAlbum.name}`}
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
              {selectedAlbum.name} — {openIndex! + 1} of {selectedAlbum.photos.length}
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
            {selectedAlbum.photos.length > 1 && (
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

            {selectedAlbum.photos.length > 1 && (
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
                icon="web"
                url={activePhoto.downloadWebUrl}
                filename={activePhoto.downloadWebFilename}
                label="Download web size"
              />
            )}
            {activePhoto.downloadOriginalUrl && (
              <DownloadButton
                icon="full"
                url={activePhoto.downloadOriginalUrl}
                filename={activePhoto.downloadOriginalFilename}
                label="Download full resolution"
              />
            )}
          </div>
        </div>
      )}
    </div>
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
