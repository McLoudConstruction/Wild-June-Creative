import Link from 'next/link';
import type { HeroBlockProps } from '@/lib/site/blocks';

export function Hero({
  heading,
  script,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: HeroBlockProps) {
  return (
    <section style={{ padding: '70px 32px 0', textAlign: 'center' }}>
      <div className="container" style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2.3rem, 4vw, 3.4rem)', lineHeight: 1.15 }}>{heading}</h1>
        {script && (
          <p
            style={{
              fontFamily: 'var(--font-script)',
              fontSize: '2.1rem',
              color: 'var(--sage)',
              margin: '10px 0 0',
            }}
          >
            {script}
          </p>
        )}
        {body && (
          <p style={{ marginTop: 22, color: 'var(--warm-gray)', fontSize: 17 }}>{body}</p>
        )}
        <div
          style={{
            marginTop: 32,
            display: 'flex',
            gap: 24,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {primaryLabel && (
            <Link href={primaryHref || '#'} className="btn-primary">
              {primaryLabel}
            </Link>
          )}
          {secondaryLabel && (
            <Link href={secondaryHref || '#'} className="btn-secondary">
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
