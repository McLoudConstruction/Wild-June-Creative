'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getSignedMediaUploadUrl,
  processMediaUpload,
  listMediaLibrary,
  listGalleriesForPicker,
  listGalleryPhotosForPicker,
  copyGalleryPhotoToMediaLibrary,
  type MediaLibraryItem,
  type GalleryOption,
  type GalleryPhotoOption,
} from '@/lib/admin/media-actions';

type Tab = 'upload' | 'library' | 'gallery';

// A photo, wherever it comes from, ends up as a plain URL handed back
// via onSelect — the caller (ImageField) doesn't need to know which
// tab it came from.
export function MediaPickerModal({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('library');

  const [libraryItems, setLibraryItems] = useState<MediaLibraryItem[] | null>(null);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [galleries, setGalleries] = useState<GalleryOption[] | null>(null);
  const [selectedGalleryId, setSelectedGalleryId] = useState('');
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhotoOption[] | null>(null);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [copyingPhotoId, setCopyingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    if (tab === 'library' && libraryItems === null) {
      listMediaLibrary()
        .then(setLibraryItems)
        .catch((err) => setLibraryError(err instanceof Error ? err.message : 'Failed to load'));
    }
    if (tab === 'gallery' && galleries === null) {
      listGalleriesForPicker()
        .then(setGalleries)
        .catch((err) => setGalleryError(err instanceof Error ? err.message : 'Failed to load'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function handleGallerySelect(galleryId: string) {
    setSelectedGalleryId(galleryId);
    setGalleryPhotos(null);
    setGalleryError(null);
    if (!galleryId) return;
    listGalleryPhotosForPicker(galleryId)
      .then(setGalleryPhotos)
      .catch((err) => setGalleryError(err instanceof Error ? err.message : 'Failed to load'));
  }

  async function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const { path, token } = await getSignedMediaUploadUrl(file.name);
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from('media-library')
        .uploadToSignedUrl(path, token, file);

      if (uploadErr) {
        throw new Error(uploadErr.message);
      }

      const result = await processMediaUpload(path, file.name);
      if (result.error || !result.url) {
        throw new Error(result.error ?? 'Upload failed');
      }

      onSelect(result.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleGalleryPhotoClick(photoId: string) {
    setCopyingPhotoId(photoId);
    setGalleryError(null);
    try {
      const result = await copyGalleryPhotoToMediaLibrary(photoId);
      if (result.error || !result.url) {
        throw new Error(result.error ?? 'Copy failed');
      }
      onSelect(result.url);
    } catch (err) {
      setGalleryError(err instanceof Error ? err.message : 'Copy failed');
    } finally {
      setCopyingPhotoId(null);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--cream)',
          borderRadius: 8,
          width: 720,
          maxWidth: '92vw',
          height: 560,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: '1px solid rgba(64,56,46,0.12)',
          }}
        >
          <div style={{ display: 'flex', gap: 4 }}>
            {(
              [
                ['library', 'Media library'],
                ['upload', 'Upload new'],
                ['gallery', 'From a gallery'],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`admin-theme-toggle${tab === value ? ' active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'upload' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--warm-gray)', marginBottom: 12 }}>
                Upload a new photo. It's added to your media library, so it'll show up under that
                tab for reuse later too.
              </p>
              <input type="file" accept="image/*" onChange={handleUploadChange} disabled={uploading} />
              {uploading && (
                <p style={{ fontSize: 13, color: 'var(--warm-gray)', marginTop: 10 }}>Uploading…</p>
              )}
              {uploadError && <p style={{ fontSize: 13, color: 'crimson', marginTop: 10 }}>{uploadError}</p>}
            </div>
          )}

          {tab === 'library' && (
            <div>
              {libraryError && <p style={{ fontSize: 13, color: 'crimson' }}>{libraryError}</p>}
              {libraryItems === null && !libraryError && (
                <p style={{ fontSize: 13, color: 'var(--warm-gray)' }}>Loading…</p>
              )}
              {libraryItems && libraryItems.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
                  Nothing uploaded yet — use "Upload new" to add your first photo.
                </p>
              )}
              {libraryItems && libraryItems.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                  }}
                >
                  {libraryItems.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => onSelect(item.url)}
                      style={{
                        padding: 0,
                        border: '1px solid rgba(64,56,46,0.15)',
                        borderRadius: 6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '1 / 1',
                        background: '#eee',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'gallery' && (
            <div>
              <label htmlFor="gallery-select" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
                Choose a gallery
              </label>
              <select
                id="gallery-select"
                value={selectedGalleryId}
                onChange={(e) => handleGallerySelect(e.target.value)}
                style={{ width: '100%', padding: 8, marginBottom: 16 }}
              >
                <option value="">Select a gallery…</option>
                {(galleries ?? []).map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>

              {galleryError && <p style={{ fontSize: 13, color: 'crimson' }}>{galleryError}</p>}

              {selectedGalleryId && galleryPhotos === null && !galleryError && (
                <p style={{ fontSize: 13, color: 'var(--warm-gray)' }}>Loading photos…</p>
              )}

              {galleryPhotos && galleryPhotos.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--warm-gray)' }}>No photos in this gallery.</p>
              )}

              {galleryPhotos && galleryPhotos.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: 10,
                  }}
                >
                  {galleryPhotos.map((photo) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => handleGalleryPhotoClick(photo.id)}
                      disabled={copyingPhotoId !== null}
                      style={{
                        position: 'relative',
                        padding: 0,
                        border: '1px solid rgba(64,56,46,0.15)',
                        borderRadius: 6,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        aspectRatio: '1 / 1',
                        background: '#eee',
                        opacity: copyingPhotoId && copyingPhotoId !== photo.id ? 0.5 : 1,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnailUrl}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {photo.isWatermarked && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            left: 4,
                            right: 4,
                            fontSize: 10,
                            textAlign: 'center',
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            borderRadius: 3,
                            padding: '2px 0',
                          }}
                        >
                          Watermarked
                        </span>
                      )}
                      {copyingPhotoId === photo.id && (
                        <span
                          style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.7)',
                            fontSize: 11,
                          }}
                        >
                          Copying…
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 14 }}>
                Picking a photo copies it into your media library at web resolution — the original
                stays untouched in the client's gallery, so this keeps working even if that
                gallery later expires.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
