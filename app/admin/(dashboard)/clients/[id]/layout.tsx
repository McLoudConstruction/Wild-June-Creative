import Link from 'next/link';
import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  noStore();
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
    <div>
      <Link href="/admin" style={{ fontSize: 13, color: '#666' }}>
        ← Clients
      </Link>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 8,
        }}
      >
        <div>
          <h1>{client.full_name}</h1>
          <p style={{ color: '#666', margin: '4px 0 0' }}>{client.email}</p>
        </div>
        <Link href={`/admin/clients/${client.id}/edit`} style={{ fontSize: 13 }}>
          Edit client
        </Link>
      </div>

      {/* No client-level tab bar anymore — Galleries (this page's own
          content) is the only thing at this level. Each individual
          gallery has its own Photos/Upload/Manage tabs via
          GallerySubNav, one level down. */}

      {children}
    </div>
  );
}

