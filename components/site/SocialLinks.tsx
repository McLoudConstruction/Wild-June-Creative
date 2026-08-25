import { Instagram, Facebook } from 'lucide-react';

// Placeholder URLs — swap these for Isabelle's actual profile links
// once she has them set up.
const INSTAGRAM_URL = 'https://instagram.com/wildjunecreative';
const FACEBOOK_URL = 'https://facebook.com/wildjunecreative';

export function SocialLinks({ color = 'var(--ink)' }: { color?: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem' }}>
      <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
        <Instagram size={18} color={color} strokeWidth={1.5} />
      </a>
      <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
        <Facebook size={18} color={color} strokeWidth={1.5} />
      </a>
    </div>
  );
}
