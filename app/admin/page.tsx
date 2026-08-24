import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInviteAction } from '@/lib/admin/actions';

export const dynamic = 'force-dynamic';

type ClientStatus = 'not_invited' | 'pending' | 'active';

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  auth_user_id: string | null;
  invite_sent_at: string | null;
  status: ClientStatus;
};

async function getClientsWithStatus(): Promise<ClientRow[]> {
  const supabase = createAdminClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !clients) {
    return [];
  }

  // One extra lookup per invited client to check whether they've
  // actually confirmed (set a password) yet or are still pending.
  // Fine at the "dozens of clients" scale this is built for — would
  // be worth batching if that ever changes.
  return Promise.all(
    clients.map(async (client): Promise<ClientRow> => {
      let status: ClientStatus = 'not_invited';

      if (client.auth_user_id) {
        const { data } = await supabase.auth.admin.getUserById(client.auth_user_id);
        status = data?.user?.email_confirmed_at ? 'active' : 'pending';
      }

      return { ...client, status };
    })
  );
}

const statusStyles: Record<ClientStatus, { label: string; color: string }> = {
  not_invited: { label: 'Not invited', color: '#888' },
  pending: { label: 'Invited — awaiting setup', color: '#b8860b' },
  active: { label: 'Active', color: 'green' },
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; email?: string };
}) {
  const clients = await getClientsWithStatus();

  return (
    <div style={{ maxWidth: 900, margin: '60px auto', padding: '0 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1>Clients</h1>
        <Link
          href="/admin/clients/new"
          style={{ padding: '8px 16px', border: '1px solid #333', borderRadius: 4 }}
        >
          + Add client
        </Link>
      </div>

      {searchParams.success === 'created' && (
        <p style={{ color: 'green' }}>Client added. Send their invite whenever you're ready.</p>
      )}
      {searchParams.success === 'invited' && (
        <p style={{ color: 'green' }}>Invite sent to {searchParams.email}.</p>
      )}
      {searchParams.error && <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>}

      {clients.length === 0 ? (
        <p style={{ color: '#888' }}>No clients yet — add one to get started.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #333' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>Email</th>
              <th style={{ padding: 8 }}>Status</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const status = statusStyles[client.status];
              return (
                <tr key={client.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8 }}>{client.full_name}</td>
                  <td style={{ padding: 8 }}>{client.email}</td>
                  <td style={{ padding: 8, color: status.color }}>{status.label}</td>
                  <td style={{ padding: 8 }}>
                    {client.status !== 'active' && (
                      <form action={sendInviteAction}>
                        <input type="hidden" name="clientId" value={client.id} />
                        <button type="submit" style={{ padding: '6px 12px' }}>
                          {client.status === 'pending' ? 'Resend invite' : 'Send invite'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
