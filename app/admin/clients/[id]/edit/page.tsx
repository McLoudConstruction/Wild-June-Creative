import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateClientRecord } from '@/lib/admin/actions';

export const dynamic = 'force-dynamic';

export default async function EditClientPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!client) {
    notFound();
  }

  return (
    <div style={{ maxWidth: 480, marginTop: 24 }}>
      <h3 style={{ fontSize: 16, marginBottom: 16 }}>Edit client details</h3>
      {client.auth_user_id && (
        <p style={{ color: '#666', fontSize: 14 }}>
          This client already has a login. Changing their email here updates their login email
          too, so they'll need to use the new one to log in.
        </p>
      )}

      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <form action={updateClientRecord}>
        <input type="hidden" name="clientId" value={client.id} />
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            defaultValue={client.full_name}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={client.email}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="phone">Phone (optional)</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={client.phone ?? ''}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Save changes
        </button>
      </form>
    </div>
  );
}
