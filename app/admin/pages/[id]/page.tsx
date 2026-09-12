import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageEditor } from '@/components/admin/PageEditor';
import type { Block } from '@/lib/site/blocks';
import type { SessionPackage } from '@/components/site/blocks/Sessions';

export const dynamic = 'force-dynamic';

export default async function EditPagePage({ params }: { params: { id: string } }) {
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
    <div>
      <Link href="/admin/pages" style={{ fontSize: 13, color: 'var(--warm-gray)' }}>
        ← Pages
      </Link>
      <PageEditor
        pageId={page.id}
        slug={page.slug}
        title={page.title}
        initialBlocks={(page.blocks as Block[] | null) ?? []}
        packages={(packages as SessionPackage[] | null) ?? []}
      />
    </div>
  );
}
