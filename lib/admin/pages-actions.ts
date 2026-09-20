'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Block } from '@/lib/site/blocks';

// Top-level route segments that already exist as real folders under
// app/ (plus "home", which is served at "/" by app/page.tsx rather
// than "/home"). A page can never take one of these slugs — it would
// either 404 behind the real route or shadow it.
const RESERVED_SLUGS = ['admin', 'api', 'auth', 'book', 'login', 'portal', 'home'];

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function publicPathFor(slug: string): string {
  return slug === 'home' ? '/' : `/${slug}`;
}

// The "New page" form on /admin/pages submits here. New pages start
// unpublished (empty, with no content yet) so they never show up on
// the live site until Isabelle has actually built something and
// flips them on from the editor.
export async function createPage(formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const rawSlug = (formData.get('slug') as string)?.trim();

  if (!title) {
    redirect(`/admin/pages?error=${encodeURIComponent('A page title is required.')}`);
  }

  const slug = slugify(rawSlug || title);

  if (!slug || RESERVED_SLUGS.includes(slug)) {
    redirect(
      `/admin/pages?error=${encodeURIComponent(
        `"${rawSlug || title}" isn't a usable page address — try something else.`
      )}`
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('pages')
    .insert({ title, slug, blocks: [], published: false })
    .select('id')
    .single();

  if (error) {
    const message =
      error.code === '23505' ? `A page at "/${slug}" already exists.` : error.message;
    redirect(`/admin/pages?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/admin/pages');
  redirect(`/admin/editor/${data!.id}`);
}

// The delete button on /admin/pages submits here. The homepage (slug
// "home") can never be deleted — app/page.tsx depends on that row
// existing.
export async function deletePageAction(formData: FormData) {
  const pageId = formData.get('pageId') as string;

  if (!pageId) {
    redirect(`/admin/pages?error=${encodeURIComponent('Missing page.')}`);
  }

  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from('pages')
    .select('slug')
    .eq('id', pageId)
    .maybeSingle();

  if (page?.slug === 'home') {
    redirect(`/admin/pages?error=${encodeURIComponent("The homepage can't be deleted.")}`);
  }

  const { error } = await supabase.from('pages').delete().eq('id', pageId);

  if (error) {
    redirect(`/admin/pages?error=${encodeURIComponent(error.message)}`);
  }

  if (page) revalidatePath(publicPathFor(page.slug));
  revalidatePath('/admin/pages');
  redirect('/admin/pages?success=deleted');
}

// Called directly from the PageEditor client component (not a
// <form action>, since it's sending a JSON block array and a bundle
// of page settings rather than FormData). Always goes through the
// service-role client — /admin has no Supabase auth session to
// satisfy an RLS write policy with. Replaces the old
// updatePageBlocks — title, slug and published now live in the same
// editor as the blocks, so they save together.
export async function savePage(
  pageId: string,
  currentSlug: string,
  data: { title: string; slug: string; published: boolean; blocks: Block[] }
): Promise<{ error: string | null; slug: string }> {
  const title = data.title.trim();

  if (!title) {
    return { error: 'A page title is required.', slug: currentSlug };
  }

  // The homepage's slug is load-bearing (app/page.tsx queries for it
  // by name, and app/[slug]/page.tsx refuses it) so it's fixed here
  // regardless of what the editor sends.
  const slug = currentSlug === 'home' ? 'home' : slugify(data.slug) || currentSlug;

  if (currentSlug !== 'home' && (!slug || RESERVED_SLUGS.includes(slug))) {
    return {
      error: `"${data.slug}" isn't a usable page address — try something else.`,
      slug: currentSlug,
    };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('pages')
    .update({ title, slug, published: data.published, blocks: data.blocks })
    .eq('id', pageId);

  if (error) {
    const message =
      error.code === '23505' ? `A page at "/${slug}" already exists.` : error.message;
    return { error: message, slug: currentSlug };
  }

  revalidatePath(publicPathFor(currentSlug));
  if (slug !== currentSlug) revalidatePath(publicPathFor(slug));
  revalidatePath('/admin/pages');

  return { error: null, slug };
}
