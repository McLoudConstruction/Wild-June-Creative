import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGalleryAction } from '@/lib/admin/gallery-actions';

export const dynamic = 'force-dynamic';

// Client-level "start a new gallery" form. Existing galleries are no
// longer picked from here — each one now has its own Upload tab
// inside its shell (/gallery/[galleryId]/upload), reached via "Edit"
// on the Galleries list. This page is purely the entry point for
// creating the next one, which then drops straight into that new
// gallery's Upload tab.
export default async function ClientNewGalleryPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
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
    <div style={{ marginTop: 8, maxWidth: 400 }}>
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <h4
        style={{
          fontSize: 13,
          color: '#888',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: 8,
        }}
      >
        Create a new gallery
      </h4>
      <form action={createGalleryAction}>
        <input type="hidden" name="clientId" value={client.id} />
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="title">Gallery title (optional)</label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="e.g. Smith Family Fall Session"
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="availabilityDays">Available for how many days?</label>
          <input
            id="availabilityDays"
            name="availabilityDays"
            type="number"
            defaultValue={30}
            min={1}
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <button type="submit" style={{ padding: '8px 16px' }}>
          Create gallery
        </button>
      </form>
    </div>
  );
}
