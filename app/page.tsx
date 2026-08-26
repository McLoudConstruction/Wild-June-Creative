import Image from 'next/image';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { PlaceholderPhoto } from '@/components/site/PlaceholderPhoto';

export const dynamic = 'force-dynamic';

// Rotated across package rows and the portfolio grid so the
// placeholders read as intentionally varied rather than repetitive
// while real photos aren't in yet.
const GRADIENTS = [
  'linear-gradient(150deg, var(--blush), var(--cream))',
  'linear-gradient(150deg, var(--dusty-blue), var(--cream))',
  'linear-gradient(150deg, var(--sage), var(--cream))',
  'linear-gradient(150deg, var(--gold), var(--cream))',
];

export default async function HomePage() {
  noStore();
  const supabase = await createClient();
  const { data: packages } = await supabase
    .from('session_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  return (
    <>
      <Header />

      {/* Hero — centered opening statement, then one large photo, the
          way a photographer's own site should lead with a photograph
          rather than illustration or text. */}
      <section style={{ padding: '70px 32px 0', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(2.3rem, 4vw, 3.4rem)', lineHeight: 1.15 }}>
            The kind of photos you&apos;ll actually put on the wall.
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-script)',
              fontSize: '2.1rem',
              color: 'var(--sage)',
              margin: '10px 0 0',
            }}
          >
            gently, honestly, in wildflower light
          </p>
          <p style={{ marginTop: 22, color: 'var(--warm-gray)', fontSize: 17 }}>
            Family sessions, portraits, and small business photography around the Kansas City
            area. Unhurried, true to how you actually look and live, delivered in a private
            gallery you&apos;ll want to revisit.
          </p>
          <div
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <Link href="/book" className="btn-primary">
              Book a session
            </Link>
            <Link href="#sessions" className="btn-secondary">
              See what&apos;s included
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: '48px 32px 90px' }}>
        <div className="container">
          <Link href="/book" aria-label="Book a session">
            <PlaceholderPhoto
              aspectRatio="21 / 9"
              gradient={GRADIENTS[1]}
              label="Add Isabelle's favorite hero photo here — wide, landscape orientation works best"
            />
          </Link>
        </div>
      </section>

      {/* Sessions — one large photo per package, alternating sides,
          the same editorial rhythm real photography sites use so the
          work carries the page rather than a plain pricing table. */}
      <section id="sessions" style={{ padding: '20px 32px 90px', background: 'var(--paper)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>Sessions</h2>
            <p style={{ color: 'var(--warm-gray)', maxWidth: 520, margin: '0 auto', fontSize: 16 }}>
              A few starting points. Every session includes a private online gallery, with the
              option to pay in full or in installments.
            </p>
          </div>

          {packages && packages.length > 0 ? (
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

      {/* Portfolio teaser — a loose masonry of placeholders standing
          in for a real gallery grid until Isabelle's actual work goes
          in. */}
      <section style={{ padding: '90px 32px' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>A few favorites</h2>
            <p style={{ color: 'var(--warm-gray)', fontSize: 16 }}>
              A small preview — the full portfolio is coming soon.
            </p>
          </div>
          <div className="portfolio-grid">
            <PlaceholderPhoto aspectRatio="3 / 4" gradient={GRADIENTS[0]} label="Portfolio photo" />
            <PlaceholderPhoto aspectRatio="1 / 1" gradient={GRADIENTS[2]} label="Portfolio photo" />
            <PlaceholderPhoto aspectRatio="4 / 5" gradient={GRADIENTS[1]} label="Portfolio photo" />
            <PlaceholderPhoto aspectRatio="4 / 5" gradient={GRADIENTS[3]} label="Portfolio photo" />
            <PlaceholderPhoto aspectRatio="1 / 1" gradient={GRADIENTS[0]} label="Portfolio photo" />
            <PlaceholderPhoto aspectRatio="3 / 4" gradient={GRADIENTS[2]} label="Portfolio photo" />
          </div>
        </div>
      </section>

      {/* About — a real face humanizes a photography site more than
          any other single element, so this gets a portrait-oriented
          placeholder rather than an illustration. */}
      <section id="about" style={{ padding: '20px 32px 100px' }}>
        <div className="container about-grid">
          <PlaceholderPhoto
            aspectRatio="4 / 5"
            gradient={GRADIENTS[3]}
            label="Add a photo of Isabelle here"
          />
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: 20 }}>Hi, I&apos;m Isabelle</h2>
            <p style={{ color: 'var(--warm-gray)', fontSize: 17, maxWidth: 480, marginBottom: 16 }}>
              I started Wild June Creative because I love the ordinary parts of a family&apos;s
              life just as much as the milestones. Around the Kansas City area, I photograph
              people the way they actually are — unposed, unhurried, and a little wild around the
              edges.
            </p>
            <Link href="/book" className="btn-secondary">
              Let&apos;s work together
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
