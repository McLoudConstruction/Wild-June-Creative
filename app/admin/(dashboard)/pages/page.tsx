import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function AdminPagesListPage() {
  const supabase = createAdminClient();
  const { data: pages } = await supabase
    .from('pages')
    .select('id, slug, title, published')
    .order('created_at', { ascending: true });

  return (
    <div>
      <h1>Pages</h1>
      <p style={{ color: 'var(--warm-gray)' }}>
        Build and edit the content on your public site — no code changes needed.
      </p>

      <div style={{ marginTop: 24 }}>
        {(pages ?? []).map((page) => (
          <Link
            key={page.id}
            href={`/admin/editor/${page.id}`}
            className="admin-clickable-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              border: '1px solid rgba(64,56,46,0.12)',
              borderRadius: 8,
              marginBottom: 12,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <span>
              <strong>{page.title}</strong>
              <span style={{ marginLeft: 12, fontSize: 13, color: 'var(--warm-gray)' }}>
                /{page.slug === 'home' ? '' : page.slug}
              </span>
            </span>
            {!page.published && (
              <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>Unpublished</span>
            )}
          </Link>
        ))}

        {pages && pages.length === 0 && (
          <p style={{ color: 'var(--warm-gray)' }}>No pages yet.</p>
        )}
      </div>
    </div>
  );
}
