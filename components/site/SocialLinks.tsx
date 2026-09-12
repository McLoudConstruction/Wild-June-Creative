import { Instagram, Facebook } from 'lucide-react';

// Pinterest/TikTok icons aren't in lucide-react's core set the rest of
// this project uses, so they're small inline SVGs rather than pulling
// in a second icon library for two glyphs.
function PinterestIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2C6.48 2 2 6.48 2 12c0 4.24 2.64 7.86 6.36 9.32-.09-.79-.17-2.01.03-2.88.19-.79 1.23-5.02 1.23-5.02s-.31-.63-.31-1.55c0-1.45.84-2.53 1.89-2.53.89 0 1.32.67 1.32 1.47 0 .9-.57 2.24-.87 3.48-.25 1.04.52 1.89 1.54 1.89 1.85 0 3.28-1.95 3.28-4.77 0-2.49-1.79-4.24-4.35-4.24-2.96 0-4.7 2.22-4.7 4.51 0 .89.34 1.85.77 2.37a.31.31 0 0 1 .07.3c-.08.33-.26 1.04-.29 1.19-.05.19-.15.24-.35.14-1.3-.61-2.11-2.51-2.11-4.04 0-3.28 2.39-6.3 6.87-6.3 3.61 0 6.41 2.57 6.41 6 0 3.58-2.26 6.47-5.39 6.47-1.05 0-2.04-.55-2.38-1.19l-.65 2.46c-.24.9-.87 2.03-1.3 2.72.98.3 2.02.46 3.1.46 5.52 0 10-4.48 10-10S17.52 2 12 2Z"
        stroke={color}
        strokeWidth="0.4"
        fill={color}
      />
    </svg>
  );
}

function TikTokIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.6 5.82c-.9-.98-1.4-2.26-1.4-3.62h-3.14v13.6c0 1.55-1.26 2.8-2.8 2.8a2.8 2.8 0 0 1 0-5.6c.28 0 .56.04.82.12v-3.2a6.02 6.02 0 0 0-.82-.06 6 6 0 1 0 6 6V9.4a8.9 8.9 0 0 0 4.34 1.12V7.38c-1.02 0-2.02-.32-2.84-.94-.06-.05-.11-.1-.16-.15Z"
        fill={color}
      />
    </svg>
  );
}

// Reads its links from site_settings (Admin > Settings > Branding)
// rather than having them hardcoded, so Isabelle can set/change them
// herself. A link only renders when its URL is actually set.
export function SocialLinks({
  color = 'var(--ink)',
  instagramUrl,
  facebookUrl,
  pinterestUrl,
  tiktokUrl,
}: {
  color?: string;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  pinterestUrl?: string | null;
  tiktokUrl?: string | null;
}) {
  if (!instagramUrl && !facebookUrl && !pinterestUrl && !tiktokUrl) {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      {instagramUrl && (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
          <Instagram size={18} color={color} strokeWidth={1.5} />
        </a>
      )}
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
          <Facebook size={18} color={color} strokeWidth={1.5} />
        </a>
      )}
      {pinterestUrl && (
        <a href={pinterestUrl} target="_blank" rel="noopener noreferrer" aria-label="Pinterest">
          <PinterestIcon size={18} color={color} />
        </a>
      )}
      {tiktokUrl && (
        <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
          <TikTokIcon size={18} color={color} />
        </a>
      )}
    </div>
  );
}
