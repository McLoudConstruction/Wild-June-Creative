import Link from 'next/link';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { AboutBlockProps } from '@/lib/site/blocks';
import { sectionBackgroundStyle, sectionTextColors } from './appearance';

export function About(props: AboutBlockProps) {
  const { heading, body, imageSrc, buttonLabel, buttonHref } = props;
  const colors = sectionTextColors(props);

  return (
    <section id="about" style={{ padding: '90px 32px', ...sectionBackgroundStyle(props) }}>
      <div className="container about-grid">
        <PlaceholderPhoto
          aspectRatio="4 / 5"
          gradient="linear-gradient(150deg, var(--gold), var(--cream))"
          label="Add a photo of Isabelle here"
          src={imageSrc || undefined}
        />
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: 20, color: colors.heading }}>{heading}</h2>
          {body && (
            <p style={{ color: colors.body, fontSize: 17, maxWidth: 480, marginBottom: 16 }}>{body}</p>
          )}
          {buttonLabel && (
            <Link href={buttonHref || '#'} className="btn-secondary" style={{ color: colors.heading, borderBottomColor: colors.heading }}>
              {buttonLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
