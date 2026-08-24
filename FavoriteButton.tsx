'use client';

import { useTransition } from 'react';
import { toggleFavoriteAction } from '@/lib/portal/actions';

export function FavoriteButton({
  photoId,
  initialFavorite,
}: {
  photoId: string;
  initialFavorite: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(() => toggleFavoriteAction(formData))}
      style={{ position: 'absolute', top: 6, right: 6 }}
    >
      <input type="hidden" name="photoId" value={photoId} />
      <input type="hidden" name="nextFavorite" value={(!initialFavorite).toString()} />
      <button
        type="submit"
        disabled={isPending}
        aria-label={initialFavorite ? 'Remove favorite' : 'Mark as favorite'}
        style={{
          background: 'rgba(255,255,255,0.9)',
          border: 'none',
          borderRadius: '50%',
          width: 32,
          height: 32,
          fontSize: 16,
          cursor: 'pointer',
        }}
      >
        {initialFavorite ? '★' : '☆'}
      </button>
    </form>
  );
}
