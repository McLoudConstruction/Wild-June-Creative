'use client';

import { useRouter } from 'next/navigation';
import { sendInviteAction } from '@/lib/admin/actions';
import { DeleteClientButton } from '@/components/DeleteClientButton';

export type ClientStatus = 'not_invited' | 'pending' | 'active';

export const STATUS_STYLES: Record<ClientStatus, { label: string; color: string }> = {
  not_invited: { label: 'Not invited', color: '#888' },
  pending: { label: 'Invited — awaiting setup', color: '#b8860b' },
  active: { label: 'Active', color: 'green' },
};

export function ClientRow({
  id,
  fullName,
  email,
  status,
}: {
  id: string;
  fullName: string;
  email: string;
  status: ClientStatus;
}) {
  const router = useRouter();
  const statusStyle = STATUS_STYLES[status];

  return (
    <tr
      onClick={() => router.push(`/admin/clients/${id}/gallery`)}
      className="admin-clickable-row"
      style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
    >
      <td style={{ padding: 8 }}>{fullName}</td>
      <td style={{ padding: 8 }}>{email}</td>
      <td style={{ padding: 8, color: statusStyle.color }}>{statusStyle.label}</td>
      <td style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
        {status !== 'active' && (
          <form action={sendInviteAction}>
            <input type="hidden" name="clientId" value={id} />
            <button type="submit" style={{ padding: '6px 12px' }}>
              {status === 'pending' ? 'Resend invite' : 'Send invite'}
            </button>
          </form>
        )}
      </td>
      <td style={{ padding: 8 }} onClick={(e) => e.stopPropagation()}>
        <DeleteClientButton clientId={id} />
      </td>
    </tr>
  );
}
