import Link from 'next/link';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { PhotoTextBlockProps } from '@/lib/site/blocks';
import { sectionBackgroundStyle, sectionTextColors } from './appearance';

export function PhotoText(props: PhotoTextBlockProps) {
  const { eyebrow, heading, body, imageSrc, imagePosition, buttonLabel, buttonHref } = props;
  const colors = sectionTextColors(props);

  const photo = (
    <div style={{ order: imagePosition === 'right' ? 2 : 1 }}>
      <PlaceholderPhoto
        aspectRatio="4 / 5"
        gradient="linear-gradient(150deg, var(--dusty-blue), var(--cream))"
        label="Add a photo here"
        src={imageSrc || undefined}
      />
    </div>
  );

  return (
    <section style={{ padding: '90px 32px', ...sectionBackgroundStyle(props) }}>
      <div className="container photo-text-grid">
        {photo}
        <div style={{ order: imagePosition === 'right' ? 1 : 2 }}>
          {eyebrow && (
            <p
              style={{
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--accent)',
                marginBottom: 10,
              }}
            >
              {eyebrow}
            </p>
          )}
          <h2 style={{ fontSize: '1.8rem', marginBottom: 16, color: colors.heading }}>{heading}</h2>
          {body && (
            <p style={{ color: colors.body, fontSize: 16, maxWidth: 460, marginBottom: 16 }}>{body}</p>
          )}
          {buttonLabel && (
            <Link
              href={buttonHref || '#'}
              className="btn-secondary"
              style={{ color: colors.heading, borderBottomColor: colors.heading }}
            >
              {buttonLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
