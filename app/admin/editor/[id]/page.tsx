import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageEditor } from '@/components/admin/PageEditor';
import type { Block } from '@/lib/site/blocks';
import type { SessionPackage } from '@/components/site/blocks/Sessions';

export const dynamic = 'force-dynamic';

// No layout.tsx in this directory on purpose — app/admin/(dashboard)
// carries the AdminHeader/AdminSidebar chrome for the rest of admin,
// and this route sits outside that group so the editor gets the full
// viewport instead. It's still under /admin, so middleware.ts still
// requires Basic Auth for it.
export default async function EditorPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const [{ data: page }, { data: packages }] = await Promise.all([
    supabase.from('pages').select('*').eq('id', params.id).maybeSingle(),
    supabase
      .from('session_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true }),
  ]);

  if (!page) {
    notFound();
  }

  return (
    <PageEditor
      pageId={page.id}
      slug={page.slug}
      title={page.title}
      initialBlocks={(page.blocks as Block[] | null) ?? []}
      packages={(packages as SessionPackage[] | null) ?? []}
    />
  );
}
