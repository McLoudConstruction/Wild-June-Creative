import Link from 'next/link';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { SessionsBlockProps } from '@/lib/site/blocks';
import { sectionBackgroundStyle, sectionTextColors } from './appearance';

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
// here — this block only controls the heading/intro copy and
// background/text theme around them, since the packages are live
// pricing data rather than page content.
export function Sessions(props: SessionsBlockProps & { packages: SessionPackage[] }) {
  const { heading, body, packages } = props;
  const colors = sectionTextColors(props);

  return (
    <section id="sessions" style={{ padding: '90px 32px', ...sectionBackgroundStyle(props) }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 10, color: colors.heading }}>{heading}</h2>
          {body && (
            <p style={{ color: colors.body, maxWidth: 520, margin: '0 auto', fontSize: 16 }}>{body}</p>
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
                <h3 style={{ fontSize: '1.6rem', marginBottom: 8, color: colors.heading }}>{pkg.name}</h3>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', marginBottom: 14, color: colors.heading }}>
                  ${(pkg.price_cents / 100).toFixed(0)}
                </p>
                {pkg.description && (
                  <p style={{ color: colors.body, fontSize: 16, marginBottom: 20, maxWidth: 420 }}>
                    {pkg.description}
                  </p>
                )}
                <Link href={`/book/${pkg.id}`} className="btn-secondary" style={{ color: colors.heading, borderBottomColor: colors.heading }}>
                  Book this session
                </Link>
              </div>
            </div>
          ))
        ) : (
          <p style={{ color: colors.body, textAlign: 'center' }}>
            Session details are being finalized — check back soon or reach out directly.
          </p>
        )}
      </div>
    </section>
  );
}
