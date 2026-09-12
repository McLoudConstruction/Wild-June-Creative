import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { PortfolioGridBlockProps } from '@/lib/site/blocks';
import { sectionBackgroundStyle, sectionTextColors } from './appearance';

const GRADIENTS = [
  'linear-gradient(150deg, var(--blush), var(--cream))',
  'linear-gradient(150deg, var(--dusty-blue), var(--cream))',
  'linear-gradient(150deg, var(--sage), var(--cream))',
  'linear-gradient(150deg, var(--gold), var(--cream))',
];

export function PortfolioGrid(props: PortfolioGridBlockProps) {
  const { heading, body, items } = props;
  const colors = sectionTextColors(props);

  return (
    <section style={{ padding: '90px 32px', ...sectionBackgroundStyle(props) }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 10, color: colors.heading }}>{heading}</h2>
          {body && <p style={{ color: colors.body, fontSize: 16 }}>{body}</p>}
        </div>
        <div className="portfolio-grid">
          {items.map((item, i) => (
            <PlaceholderPhoto
              key={i}
              aspectRatio={item.aspectRatio}
              gradient={GRADIENTS[i % GRADIENTS.length]}
              label="Portfolio photo"
              src={item.imageSrc || undefined}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
