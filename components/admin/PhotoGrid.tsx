'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  deletePhotoAction,
  moveManyPhotosToFolderAction,
} from '@/lib/admin/gallery-actions';
import { PhotoFolderSelect } from '@/components/admin/PhotoFolderSelect';

type Photo = {
  id: string;
  file_name: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_path: string | null;
  folder_id: string | null;
  is_watermarked: boolean;
  url: string | null;
};

type Folder = { id: string; name: string };

export function PhotoGrid({
  photos,
  folders,
  clientId,
}: {
  photos: Photo[];
  folders: Folder[];
  clientId: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkFolderId, setBulkFolderId] = useState('');
  const [isPending, startTransition] = useTransition();

  // Same grouping as before: one section per folder, plus a trailing
  // "Unsorted" bucket for anything without a folder_id — hidden
  // entirely once it's empty so the page doesn't show a permanent
  // dead section once everything's been sorted.
  const groups = useMemo(() => {
    const named = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      photos: photos.filter((p) => p.folder_id === folder.id),
    }));
    const unsorted = {
      id: null as string | null,
      name: 'Unsorted',
      photos: photos.filter((p) => !p.folder_id),
    };
    return unsorted.photos.length > 0 ? [...named, unsorted] : named;
  }, [photos, folders]);

  function toggle(photoId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  }

  function toggleGroup(groupPhotos: Photo[], allSelected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      groupPhotos.forEach((p) => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  }

  function handleBulkMove() {
    if (selectedIds.size === 0 || isPending) return;
    const formData = new FormData();
    formData.set('clientId', clientId);
    formData.set('folderId', bulkFolderId);
    selectedIds.forEach((id) => formData.append('photoIds', id));
    startTransition(() => {
      moveManyPhotosToFolderAction(formData);
    });
  }

  return (
    <div style={{ marginTop: 24 }}>
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: 6,
            padding: '10px 12px',
            marginBottom: 16,
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
          }}
        >
          <strong style={{ fontSize: 13 }}>{selectedIds.size} selected</strong>
          <select
            value={bulkFolderId}
            onChange={(e) => setBulkFolderId(e.target.value)}
            disabled={isPending}
            style={{ padding: 6, fontSize: 13 }}
          >
            <option value="">Move to: Unsorted</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                Move to: {folder.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkMove}
            disabled={isPending}
            style={{ padding: '6px 14px', fontSize: 13 }}
          >
            {isPending ? 'Moving…' : 'Move selected'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={isPending}
            style={{ padding: '6px 14px', fontSize: 13, color: '#666' }}
          >
            Clear selection
          </button>
        </div>
      )}

      {groups.map((group) => {
        const allSelected =
          group.photos.length > 0 && group.photos.every((p) => selectedIds.has(p.id));

        return (
          <div key={group.id ?? 'unsorted'} style={{ marginBottom: 32 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
              }}
            >
              <h4 style={{ fontSize: 14, color: '#555', margin: 0 }}>
                {group.name} <span style={{ color: '#aaa' }}>({group.photos.length})</span>
              </h4>
              {group.photos.length > 0 && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.photos, allSelected)}
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    background: 'none',
                    border: '1px solid #ddd',
                    borderRadius: 4,
                    cursor: 'pointer',
                    color: '#555',
                  }}
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {group.photos.length === 0 ? (
              <p style={{ color: '#aaa', fontSize: 13 }}>No photos in this folder yet.</p>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 8,
                }}
              >
                {group.photos.map((photo) => {
                  const isSelected = selectedIds.has(photo.id);
                  return (
                    <div
                      key={photo.id}
                      style={{
                        position: 'relative',
                        outline: isSelected ? '2px solid #2563eb' : 'none',
                        borderRadius: 4,
                      }}
                    >
                      <label
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          zIndex: 1,
                          background: 'rgba(255,255,255,0.9)',
                          borderRadius: 4,
                          width: 22,
                          height: 22,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggle(photo.id)}
                          aria-label={`Select ${photo.file_name}`}
                        />
                      </label>

                      {photo.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo.url}
                          alt={photo.file_name}
                          style={{
                            width: '100%',
                            height: 140,
                            objectFit: 'cover',
                            borderRadius: 4,
                          }}
                        />
                      )}

                      {photo.is_watermarked && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            background: 'rgba(0,0,0,0.6)',
                            color: 'white',
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 3,
                          }}
                        >
                          Watermarked
                        </span>
                      )}

                      {folders.length > 0 && (
                        <PhotoFolderSelect
                          photoId={photo.id}
                          clientId={clientId}
                          currentFolderId={photo.folder_id}
                          folders={folders}
                        />
                      )}

                      <form action={deletePhotoAction} style={{ marginTop: 4 }}>
                        <input type="hidden" name="photoId" value={photo.id} />
                        <input type="hidden" name="storagePath" value={photo.storage_path} />
                        <input
                          type="hidden"
                          name="thumbnailPath"
                          value={photo.thumbnail_path ?? ''}
                        />
                        <input
                          type="hidden"
                          name="originalPath"
                          value={photo.original_path ?? ''}
                        />
                        <input type="hidden" name="clientId" value={clientId} />
                        <button
                          type="submit"
                          style={{ fontSize: 12, padding: '2px 8px', color: 'crimson' }}
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
