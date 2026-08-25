import Image from 'next/image';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  noStore();
  const supabase = await createClient();
  const { data: packages } = await supabase
    .from('session_packages')
    .select('*')
    .eq('is_active', true)
    .order('price_cents', { ascending: true })
    .limit(3);

  return (
    <>
      <Header />

      <section style={{ padding: '70px 32px 100px' }}>
        <div className="container hero-grid">
          <div>
            <h1 style={{ fontSize: 'clamp(2.3rem, 4vw, 3.4rem)', lineHeight: 1.15 }}>
              The kind of photos you&apos;ll actually put on the wall.
            </h1>
            <p
              style={{
                fontFamily: 'var(--font-script)',
                fontSize: '2.1rem',
                color: 'var(--sage)',
                margin: '12px 0 0',
              }}
            >
              gently, honestly, in wildflower light
            </p>
            <p style={{ marginTop: 24, maxWidth: 480, color: 'var(--warm-gray)', fontSize: 17 }}>
              Family sessions, portraits, and small business photography around the Kansas City
              area. Unhurried, true to how you actually look and live, delivered in a private
              gallery you&apos;ll want to revisit.
            </p>
            <div style={{ marginTop: 36, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Link href="/book" className="btn-primary">
                Book a session
              </Link>
              <Link href="#packages" className="btn-secondary">
                See what&apos;s included
              </Link>
            </div>
          </div>
          <div>
            <Image
              src="/brand/wildflower-camera.png"
              alt="Hand-drawn illustration of a camera surrounded by wildflowers"
              width={1920}
              height={1080}
              priority
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      </section>

      <section id="packages" style={{ padding: '80px 32px', background: 'var(--paper)' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', marginBottom: 10 }}>Sessions</h2>
          <p style={{ color: 'var(--warm-gray)', maxWidth: 560, marginBottom: 48, fontSize: 16 }}>
            A few starting points. Every session includes a private online gallery, with the
            option to pay in full or in installments.
          </p>

          {packages && packages.length > 0 ? (
            <div className="packages-grid">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  style={{
                    background: 'var(--cream)',
                    padding: '32px 28px',
                    border: '1px solid var(--taupe)',
                  }}
                >
                  <h3 style={{ fontSize: '1.3rem', marginBottom: 10 }}>{pkg.name}</h3>
                  {pkg.description && (
                    <p style={{ color: 'var(--warm-gray)', fontSize: 15, marginBottom: 18 }}>
                      {pkg.description}
                    </p>
                  )}
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', marginBottom: 20 }}>
                    ${(pkg.price_cents / 100).toFixed(0)}
                  </p>
                  <Link href={`/book/${pkg.id}`} className="btn-secondary">
                    Book this session
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--warm-gray)' }}>
              Session details are being finalized — check back soon or reach out directly.
            </p>
          )}
        </div>
      </section>

      <section id="about" style={{ padding: '90px 32px' }}>
        <div className="container about-grid">
          <Image
            src="/brand/wildflower-cluster-01.png"
            alt="Hand-drawn wildflower illustration"
            width={1800}
            height={1800}
            style={{ width: '100%', height: 'auto' }}
          />
          <div>
            <h2 style={{ fontSize: '2rem', marginBottom: 20 }}>Hi, I&apos;m Isabelle</h2>
            <p style={{ color: 'var(--warm-gray)', fontSize: 17, maxWidth: 520, marginBottom: 16 }}>
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
