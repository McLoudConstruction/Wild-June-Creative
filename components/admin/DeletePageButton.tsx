'use client';

import { deletePageAction } from '@/lib/admin/pages-actions';

// Deleting a page removes its content permanently (unlike deleting a
// gallery folder, there's nothing to fall back to), so this always
// confirms first.
export function DeletePageButton({ pageId, title }: { pageId: string; title: string }) {
  return (
    <form
      action={deletePageAction}
      onSubmit={(e) => {
        if (!confirm(`Delete "${title}"? This can't be undone.`)) {
          e.preventDefault();
        }
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="pageId" value={pageId} />
      <button
        type="submit"
        aria-label={`Delete ${title}`}
        style={{ fontSize: 12, padding: '4px 10px', color: 'crimson', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Delete
      </button>
    </form>
  );
}
