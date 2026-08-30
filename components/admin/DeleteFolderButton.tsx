'use client';

import { deleteFolderAction } from '@/lib/admin/gallery-actions';

// Deleting a folder never deletes photos (they just become unsorted
// again) but it's still worth a confirm — the label and any zip
// naming tied to it goes away immediately.
export function DeleteFolderButton({
  folderId,
  clientId,
  galleryId,
}: {
  folderId: string;
  clientId: string;
  galleryId: string;
}) {
  return (
    <form
      action={deleteFolderAction}
      onSubmit={(e) => {
        if (!confirm('Delete this folder? Photos inside will become unsorted, not deleted.')) {
          e.preventDefault();
        }
      }}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="folderId" value={folderId} />
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="galleryId" value={galleryId} />
      <button type="submit" style={{ fontSize: 12, padding: '2px 8px', color: 'crimson' }}>
        Delete folder
      </button>
    </form>
  );
}
