import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { BlockRenderer } from '@/components/site/blocks/BlockRenderer';
import type { Block } from '@/lib/site/blocks';
import type { SessionPackage } from '@/components/site/blocks/Sessions';

export const dynamic = 'force-dynamic';

// Renders any additional page built in /admin/pages, by slug — the
// same block-based content and BlockRenderer app/page.tsx uses for
// the homepage. "home" is excluded here on purpose: that page is
// served at "/" by app/page.tsx, not "/home", so a request for it
// here 404s rather than showing a duplicate.
export default async function SitePage({ params }: { params: { slug: string } }) {
  if (params.slug === 'home') {
    notFound();
  }

  noStore();
  const supabase = await createClient();

  const [{ data: page }, { data: packages }] = await Promise.all([
    supabase
      .from('pages')
      .select('blocks')
      .eq('slug', params.slug)
      .eq('published', true)
      .maybeSingle(),
    supabase
      .from('session_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true }),
  ]);

  if (!page) {
    notFound();
  }

  const blocks = ((page.blocks as Block[] | undefined) ?? []) as Block[];

  return (
    <>
      <Header />
      <BlockRenderer blocks={blocks} packages={(packages as SessionPackage[] | null) ?? []} />
      <Footer />
    </>
  );
}
