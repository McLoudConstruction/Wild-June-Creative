'use client';

import { deleteClientAction } from '@/lib/admin/actions';

// Small client component just for the confirm() dialog — the actual
// delete logic is the server action, this only exists to make sure a
// misclick can't silently delete someone's record and login.
export function DeleteClientButton({ clientId }: { clientId: string }) {
  return (
    <form
      action={deleteClientAction}
      onSubmit={(e) => {
        if (!confirm('Delete this client? This also deletes their login and cannot be undone.')) {
          e.preventDefault();
        }
      }}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <button type="submit" style={{ padding: '6px 12px', color: 'crimson' }}>
        Delete
      </button>
    </form>
  );
}
