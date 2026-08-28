'use client';

import { useTransition } from 'react';
import { movePhotoToFolderAction } from '@/lib/admin/gallery-actions';

// Auto-submits on change instead of needing a separate "move" button —
// re-sorting an already-uploaded photo into (or out of) a folder is a
// one-click action, not a form to fill out.
export function PhotoFolderSelect({
  photoId,
  clientId,
  currentFolderId,
  folders,
}: {
  photoId: string;
  clientId: string;
  currentFolderId: string | null;
  folders: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => movePhotoToFolderAction(formData))}
      style={{ marginTop: 4 }}
    >
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="clientId" value={clientId} />
      <select
        name="folderId"
        defaultValue={currentFolderId ?? ''}
        disabled={isPending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        style={{ width: '100%', fontSize: 11, padding: '2px 4px' }}
      >
        <option value="">Unsorted</option>
        {folders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
    </form>
  );
}
