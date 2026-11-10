'use client';

import { removeAdminAction } from '@/lib/admin/admin-users-actions';

export function RemoveAdminButton({ adminId, email }: { adminId: string; email: string }) {
  return (
    <form
      action={removeAdminAction}
      onSubmit={(e) => {
        if (!confirm(`Remove admin access for ${email}?`)) {
          e.preventDefault();
        }
      }}
      style={{ display: 'inline' }}
    >
      <input type="hidden" name="adminId" value={adminId} />
      <button
        type="submit"
        aria-label={`Remove admin access for ${email}`}
        style={{ fontSize: 12, padding: '4px 10px', color: 'crimson', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Remove
      </button>
    </form>
  );
}
