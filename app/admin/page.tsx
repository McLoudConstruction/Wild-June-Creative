import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInviteAction } from '@/lib/admin/actions';
import { DeleteClientButton } from '@/components/DeleteClientButton';

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
  // force-dynamic on its own only guarantees the *page* isn't
  // statically cached — it doesn't necessarily stop underlying data
  // calls made by third-party clients like Supabase's SDK from being
  // cached separately. noStore() is the explicit, documented way to
  // opt a non-fetch() data source like this one out of caching
  // entirely.
  noStore();

  const supabase = createAdminClient();

  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !clients) {
    return [];
  }

  return Promise.all(
    clients.map(async (client): Promise<ClientRow> => {
      let status: ClientStatus = 'not_invited';

      if (client.auth_user_id) {
        try {
          const { data } = await supabase.auth.admin.getUserById(client.auth_user_id);
          status = data?.user?.email_confirmed_at ? 'active' : 'pending';
        } catch {
          // Don't let one client's auth lookup failure take down the
          // whole list — fall back to "not_invited" display rather
          // than crashing the page.
          status = 'not_invited';
        }
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
    <div style={{ maxWidth: 1000, margin: '60px auto', padding: '0 16px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <h1>Clients</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/admin/settings/packages" style={{ fontSize: 14 }}>
            Packages
          </Link>
          <Link href="/admin/settings/watermark" style={{ fontSize: 14 }}>
            Watermark settings
          </Link>
          <Link
            href="/admin/clients/new"
            style={{ padding: '8px 16px', border: '1px solid #333', borderRadius: 4 }}
          >
            + Add client
          </Link>
        </div>
      </div>

      {searchParams.success === 'created' && (
        <p style={{ color: 'green' }}>Client added. Send their invite whenever you're ready.</p>
      )}
      {searchParams.success === 'invited' && (
        <p style={{ color: 'green' }}>Invite sent to {searchParams.email}.</p>
      )}
      {searchParams.success === 'updated' && (
        <p style={{ color: 'green' }}>Client updated.</p>
      )}
      {searchParams.success === 'deleted' && (
        <p style={{ color: 'green' }}>Client deleted.</p>
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
              <th style={{ padding: 8 }} colSpan={4} />
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
                  <td style={{ padding: 8 }}>
                    <Link href={`/admin/clients/${client.id}/edit`} style={{ padding: '6px 12px' }}>
                      Edit
                    </Link>
                  </td>
                  <td style={{ padding: 8 }}>
                    <Link
                      href={`/admin/clients/${client.id}/gallery`}
                      style={{ padding: '6px 12px' }}
                    >
                      Gallery
                    </Link>
                  </td>
                  <td style={{ padding: 8 }}>
                    <DeleteClientButton clientId={client.id} />
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
