import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { ClientRow, type ClientStatus } from '@/components/admin/ClientRow';

export const dynamic = 'force-dynamic';

type ClientListItem = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  auth_user_id: string | null;
  invite_sent_at: string | null;
  status: ClientStatus;
};

async function getClientsWithStatus(): Promise<ClientListItem[]> {
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
    clients.map(async (client): Promise<ClientListItem> => {
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

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: { success?: string; error?: string; email?: string };
}) {
  const clients = await getClientsWithStatus();

  return (
    <div>
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
              <th style={{ padding: 8 }} colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <ClientRow
                key={client.id}
                id={client.id}
                fullName={client.full_name}
                email={client.email}
                status={client.status}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
