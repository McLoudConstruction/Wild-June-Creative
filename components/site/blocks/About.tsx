import Link from 'next/link';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { AboutBlockProps } from '@/lib/site/blocks';

export function About({ heading, body, imageSrc, buttonLabel, buttonHref }: AboutBlockProps) {
  return (
    <section id="about" style={{ padding: '20px 32px 100px' }}>
      <div className="container about-grid">
        <PlaceholderPhoto
          aspectRatio="4 / 5"
          gradient="linear-gradient(150deg, var(--gold), var(--cream))"
          label="Add a photo of Isabelle here"
          src={imageSrc || undefined}
        />
        <div>
          <h2 style={{ fontSize: '2rem', marginBottom: 20 }}>{heading}</h2>
          {body && (
            <p style={{ color: 'var(--warm-gray)', fontSize: 17, maxWidth: 480, marginBottom: 16 }}>
              {body}
            </p>
          )}
          {buttonLabel && (
            <Link href={buttonHref || '#'} className="btn-secondary">
              {buttonLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
