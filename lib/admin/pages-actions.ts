'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Block } from '@/lib/site/blocks';

// Called directly from the PageEditor client component (not a
// <form action>, since we're sending a JSON block array rather than
// FormData). Always goes through the service-role client — /admin has
// no Supabase auth session to satisfy an RLS write policy with.
export async function updatePageBlocks(
  pageId: string,
  slug: string,
  blocks: Block[]
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('pages').update({ blocks }).eq('id', pageId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(slug === 'home' ? '/' : `/${slug}`);
  revalidatePath('/admin/pages');

  return { error: null };
}
