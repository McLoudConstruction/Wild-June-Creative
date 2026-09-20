import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { createPage } from '@/lib/admin/pages-actions';
import { DeletePageButton } from '@/components/admin/DeletePageButton';
import { NavLinksEditor } from '@/components/admin/NavLinksEditor';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site/settings';

export const dynamic = 'force-dynamic';

export default async function AdminPagesListPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const supabase = createAdminClient();
  const [{ data: pages }, { data: siteSettingsRow }] = await Promise.all([
    supabase
      .from('pages')
      .select('id, slug, title, published')
      .order('created_at', { ascending: true }),
    supabase.from('site_settings').select('nav_links').eq('id', true).maybeSingle(),
  ]);

  const navLinks = siteSettingsRow?.nav_links ?? DEFAULT_SITE_SETTINGS.nav_links;

  return (
    <div>
      <h1>Pages</h1>
      <p style={{ color: 'var(--warm-gray)' }}>
        Build and edit the content on your public site — no code changes needed.
      </p>

      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}
      {searchParams.success === 'deleted' && (
        <p style={{ color: 'var(--warm-gray)' }}>Page deleted.</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 40, marginTop: 24 }}>
        {/* Main: header/footer navigation editor — what shows in the
            menu, its text, and what it links to, independent of which
            pages exist. */}
        <div>
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Header navigation</h2>
          <p style={{ fontSize: 13, color: 'var(--warm-gray)', marginTop: -8 }}>
            Choose what shows in the menu, edit its text, and set what each link points to. The
            same list also appears in the footer.
          </p>
          <NavLinksEditor initialLinks={navLinks} />
        </div>

        {/* Side: every page that exists, for reference while filling
            in nav links above, plus create/delete. */}
        <div>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--warm-gray)', marginTop: 0 }}>
            All pages
          </h2>

          {(pages ?? []).map((page) => (
            <div
              key={page.id}
              className="admin-clickable-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                border: '1px solid rgba(64,56,46,0.12)',
                borderRadius: 8,
                marginBottom: 10,
              }}
            >
              <Link
                href={`/admin/editor/${page.id}`}
                style={{ flex: 1, textDecoration: 'none', color: 'inherit', minWidth: 0 }}
              >
                <strong style={{ display: 'block', fontSize: 14 }}>{page.title}</strong>
                <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                  /{page.slug === 'home' ? '' : page.slug}
                </span>
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {!page.published && (
                  <span style={{ fontSize: 11, color: 'var(--warm-gray)' }}>Unpublished</span>
                )}
                {page.slug !== 'home' && <DeletePageButton pageId={page.id} title={page.title} />}
              </div>
            </div>
          ))}

          {pages && pages.length === 0 && (
            <p style={{ color: 'var(--warm-gray)', fontSize: 13 }}>No pages yet.</p>
          )}

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(64,56,46,0.12)' }}>
            <h3 style={{ fontSize: 14 }}>New page</h3>
            <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: -4 }}>
              Starts empty and unpublished.
            </p>
            <form action={createPage}>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="title" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                  Page title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  placeholder="e.g. Portfolio"
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="slug" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                  Page address (optional)
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  placeholder="Generated from the title if left blank"
                  style={{ width: '100%', padding: 8 }}
                />
              </div>
              <button type="submit" className="btn-primary" style={{ border: 'none', cursor: 'pointer' }}>
                Create page
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
