import { Camera } from 'lucide-react';

// Stands in for a real photo until Isabelle swaps it out. Deliberately
// looks like a designed placeholder rather than a fake stock photo —
// using an actual unlicensed photo here would be a real problem to
// ship on someone else's site, and a soft on-brand gradient is honest
// about what it is while still holding the same visual weight a real
// photo will once it's dropped in.
export function PlaceholderPhoto({
  aspectRatio = '4 / 5',
  label = 'Add a photo here',
  gradient = 'linear-gradient(150deg, var(--blush), var(--cream))',
}: {
  aspectRatio?: string;
  label?: string;
  gradient?: string;
}) {
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
