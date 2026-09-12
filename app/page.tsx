import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { BlockRenderer } from '@/components/site/blocks/BlockRenderer';
import type { Block } from '@/lib/site/blocks';
import type { SessionPackage } from '@/components/site/blocks/Sessions';

export const dynamic = 'force-dynamic';

// The homepage's content lives in the `pages` table now (slug
// "home"), edited from /admin/pages — this file just fetches the
// blocks and the live session packages, then hands both to the same
// BlockRenderer the admin editor previews with. Session packages stay
// a separate query because they're live pricing data managed under
// Admin > Sales, not page content.
export default async function HomePage() {
  noStore();
  const supabase = await createClient();

  const [{ data: page }, { data: packages }] = await Promise.all([
    supabase.from('pages').select('blocks').eq('slug', 'home').eq('published', true).maybeSingle(),
    supabase
      .from('session_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true }),
  ]);

  const blocks = ((page?.blocks as Block[] | undefined) ?? []) as Block[];

  return (
    <>
      <Header />
      <BlockRenderer blocks={blocks} packages={(packages as SessionPackage[] | null) ?? []} />
      <Footer />
    </>
  );
}
