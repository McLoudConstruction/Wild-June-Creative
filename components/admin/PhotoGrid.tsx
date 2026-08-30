'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import {
  deletePhotoAction,
  moveManyPhotosToFolderAction,
  createFolderInlineAction,
} from '@/lib/admin/gallery-actions';
import { PhotoFolderSelect } from '@/components/admin/PhotoFolderSelect';

// Sentinel value for the "+ Create new folder…" option in the bulk
// move dropdown. Never a real folder id, so it's safe to compare
// against directly.
const CREATE_NEW_VALUE = '__create_new__';

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
  galleryId,
  filterFolderId,
}: {
  photos: Photo[];
  folders: Folder[];
  clientId: string;
  // Needed so a folder created from this component's dropdown can be
  // attached to the right gallery.
  galleryId: string;
  // When provided, shows only the matching folder's photos as a single
  // section instead of the full folder-by-folder breakdown — this is
  // what powers clicking a specific folder in the Gallery sidebar.
  // 'unsorted' selects photos with no folder_id; omit entirely to show
  // every folder grouped, which is the "All Photos" view.
  filterFolderId?: string | 'unsorted';
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkFolderId, setBulkFolderId] = useState('');
  const [isPending, startTransition] = useTransition();

  // Folders as known to this component. Starts from the server-provided
  // list and gets a new entry appended the moment one is created inline,
  // so the dropdown (and each photo's own folder select) can offer the
  // new folder immediately — without waiting on a full page reload,
  // which would otherwise also wipe the current selection.
  const [localFolders, setLocalFolders] = useState<Folder[]>(folders);
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  const [isCreatingNewFolder, setIsCreatingNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSavingNewFolder, setIsSavingNewFolder] = useState(false);
  const [newFolderError, setNewFolderError] = useState<string | null>(null);

  async function handleCreateFolder() {
    const trimmed = newFolderName.trim();
    if (!trimmed || isSavingNewFolder) return;

    setIsSavingNewFolder(true);
    setNewFolderError(null);

    const result = await createFolderInlineAction(galleryId, trimmed);

    setIsSavingNewFolder(false);

    if ('error' in result) {
      setNewFolderError(result.error);
      return;
    }

    setLocalFolders((current) => [...current, { id: result.id, name: result.name }]);
    setBulkFolderId(result.id);
    setIsCreatingNewFolder(false);
    setNewFolderName('');
    // Picks up the new folder in the sidebar's folder list and counts
    // on next navigation, without disturbing the in-progress selection
    // on this page.
    router.refresh();
  }

  // Same grouping as before: one section per folder, plus a trailing
  // "Unsorted" bucket for anything without a folder_id — hidden
  // entirely once it's empty so the page doesn't show a permanent
  // dead section once everything's been sorted. When filterFolderId is
  // set, skip the breakdown and show just that one folder as a single
  // flat section instead.
  const groups = useMemo(() => {
    if (filterFolderId !== undefined) {
      const matching =
        filterFolderId === 'unsorted'
          ? photos.filter((p) => !p.folder_id)
          : photos.filter((p) => p.folder_id === filterFolderId);
      const name =
        filterFolderId === 'unsorted'
          ? 'Unsorted'
          : localFolders.find((f) => f.id === filterFolderId)?.name ?? 'Folder';
      return [{ id: filterFolderId, name, photos: matching }];
    }

    const named = localFolders.map((folder) => ({
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
  }, [photos, localFolders, filterFolderId]);

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
            value={isCreatingNewFolder ? CREATE_NEW_VALUE : bulkFolderId}
            onChange={(e) => {
              const value = e.target.value;
              if (value === CREATE_NEW_VALUE) {
                setIsCreatingNewFolder(true);
                setNewFolderError(null);
              } else {
                setIsCreatingNewFolder(false);
                setBulkFolderId(value);
              }
            }}
            disabled={isPending}
            style={{ padding: 6, fontSize: 13 }}
          >
            <option value="">Move to: Unsorted</option>
            {localFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                Move to: {folder.name}
              </option>
            ))}
            <option value={CREATE_NEW_VALUE}>+ Create new folder…</option>
          </select>

          {isCreatingNewFolder && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateFolder();
                  }
                }}
                placeholder="New folder name"
                disabled={isSavingNewFolder}
                style={{ padding: 6, fontSize: 13 }}
              />
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={isSavingNewFolder || !newFolderName.trim()}
                style={{ padding: '6px 10px', fontSize: 13 }}
              >
                {isSavingNewFolder ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreatingNewFolder(false);
                  setNewFolderName('');
                  setNewFolderError(null);
                }}
                disabled={isSavingNewFolder}
                style={{ padding: '6px 10px', fontSize: 13, color: '#666' }}
              >
                Cancel
              </button>
              {newFolderError && (
                <span style={{ color: 'crimson', fontSize: 12 }}>{newFolderError}</span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleBulkMove}
            disabled={isPending || isCreatingNewFolder}
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
                            bottom: 4,
                            left: 4,
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

                      <form
                        action={deletePhotoAction}
                        onSubmit={(e) => {
                          if (!confirm(`Delete "${photo.file_name}"? This can't be undone.`)) {
                            e.preventDefault();
                          }
                        }}
                        style={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                      >
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
                          aria-label={`Delete ${photo.file_name}`}
                          style={{
                            background: 'rgba(255,255,255,0.9)',
                            border: 'none',
                            borderRadius: 4,
                            width: 22,
                            height: 22,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'crimson',
                            padding: 0,
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </form>

                      {localFolders.length > 0 && (
                        <PhotoFolderSelect
                          photoId={photo.id}
                          clientId={clientId}
                          currentFolderId={photo.folder_id}
                          folders={localFolders}
                        />
                      )}
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
