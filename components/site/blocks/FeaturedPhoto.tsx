import Link from 'next/link';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';
import type { FeaturedPhotoBlockProps } from '@/lib/site/blocks';

export function FeaturedPhoto({ imageSrc, href, aspectRatio, label }: FeaturedPhotoBlockProps) {
  const photo = (
    <PlaceholderPhoto
      aspectRatio={aspectRatio}
      label={label}
      gradient="linear-gradient(150deg, var(--dusty-blue), var(--cream))"
      src={imageSrc || undefined}
    />
  );

  return (
    <section style={{ padding: '48px 32px 90px' }}>
      <div className="container">
        {href ? (
          <Link href={href} aria-label={label}>
            {photo}
          </Link>
        ) : (
          photo
        )}
      </div>
    </section>
  );
}
