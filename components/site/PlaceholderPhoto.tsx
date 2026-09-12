import { Camera } from 'lucide-react';

// Stands in for a real photo until a src is provided. Deliberately
// looks like a designed placeholder rather than a fake stock photo —
// using an actual unlicensed photo here would be a real problem to
// ship on someone else's site, and a soft on-brand gradient is honest
// about what it is while still holding the same visual weight a real
// photo will once it's dropped in.
//
// Block-editor content (see components/site/blocks) passes `src` once
// Isabelle pastes an image URL, which swaps this over to a real
// <img>. Plain <img> rather than next/image on purpose: content
// photos can come from any host she pastes a URL from, and requiring
// next.config.js remotePatterns per-host would break the moment she
// used a new one.
export function PlaceholderPhoto({
  aspectRatio = '4 / 5',
  label = 'Add a photo here',
  gradient = 'linear-gradient(150deg, var(--blush), var(--cream))',
  src,
}: {
  aspectRatio?: string;
  label?: string;
  gradient?: string;
  src?: string;
}) {
  if (src) {
    return (
      <div style={{ aspectRatio, width: '100%', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        aspectRatio,
        background: gradient,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        border: '1px solid rgba(64,56,46,0.12)',
        width: '100%',
      }}
    >
      <Camera size={26} color="var(--warm-gray)" strokeWidth={1.2} />
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--warm-gray)',
          textAlign: 'center',
          padding: '0 20px',
        }}
      >
        {label}
      </span>
    </div>
  );
}
