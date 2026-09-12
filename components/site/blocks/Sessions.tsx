import Link from 'next/link';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { SessionsBlockProps } from '@/lib/site/blocks';

// Rotated across package rows so placeholders read as intentionally
// varied rather than repetitive while real photos aren't in yet.
const GRADIENTS = [
  'linear-gradient(150deg, var(--blush), var(--cream))',
  'linear-gradient(150deg, var(--dusty-blue), var(--cream))',
  'linear-gradient(150deg, var(--sage), var(--cream))',
  'linear-gradient(150deg, var(--gold), var(--cream))',
];

export type SessionPackage = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
};

// Session packages themselves are managed under Admin > Sales, not
// here — this block only controls the heading/intro copy around them,
// since the packages are live pricing data rather than page content.
export function Sessions({
  heading,
  body,
  packages,
}: SessionsBlockProps & { packages: SessionPackage[] }) {
  return (
    <section id="sessions" style={{ padding: '20px 32px 90px', background: 'var(--paper)' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>{heading}</h2>
          {body && (
            <p style={{ color: 'var(--warm-gray)', maxWidth: 520, margin: '0 auto', fontSize: 16 }}>
              {body}
            </p>
          )}
        </div>

        {packages.length > 0 ? (
          packages.map((pkg, i) => (
            <div key={pkg.id} className={`package-row ${i % 2 === 1 ? 'package-row-reverse' : ''}`}>
              <PlaceholderPhoto
                aspectRatio="4 / 3"
                gradient={GRADIENTS[i % GRADIENTS.length]}
                label={`Add a photo from a ${pkg.name} session here`}
              />
              <div>
                <h3 style={{ fontSize: '1.6rem', marginBottom: 8 }}>{pkg.name}</h3>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginBottom: 14 }}>
                  ${(pkg.price_cents / 100).toFixed(0)}
                </p>
                {pkg.description && (
                  <p style={{ color: 'var(--warm-gray)', fontSize: 16, marginBottom: 20, maxWidth: 420 }}>
                    {pkg.description}
                  </p>
                )}
                <Link href={`/book/${pkg.id}`} className="btn-secondary">
                  Book this session
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: 'var(--warm-gray)', textAlign: 'center' }}>
            Session details are being finalized — check back soon or reach out directly.
          </p>
        )}
      </div>
    </section>
  );
}
