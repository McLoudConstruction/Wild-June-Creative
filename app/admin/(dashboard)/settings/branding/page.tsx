import { unstable_noStore as noStore } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateBrandingAction } from '@/lib/admin/settings-actions';
import { DEFAULT_SITE_SETTINGS, HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS } from '@/lib/site/settings';

export const dynamic = 'force-dynamic';

export default async function BrandingSettingsPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string };
}) {
  noStore();
  const supabase = createAdminClient();

  const { data } = await supabase.from('site_settings').select('*').eq('id', true).maybeSingle();
  const settings = { ...DEFAULT_SITE_SETTINGS, ...(data ?? {}) };

  return (
    <div style={{ maxWidth: 640 }}>
      <p style={{ color: 'var(--warm-gray)' }}>
        Controls the logo, header style, colors, fonts, and social/contact info shown across the
        public site.
      </p>

      {searchParams.success && <p style={{ color: 'green' }}>Settings saved.</p>}
      {searchParams.error && (
        <p style={{ color: 'crimson' }}>{decodeURIComponent(searchParams.error)}</p>
      )}

      <form action={updateBrandingAction}>
        <h3 style={{ marginTop: 28, marginBottom: 12 }}>Logo &amp; favicon</h3>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="logo">Logo</label>
          {settings.logo_url && (
            <div style={{ margin: '8px 0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.logo_url}
                alt="Current logo"
                style={{ maxWidth: 200, background: '#eee', padding: 8, borderRadius: 4 }}
              />
            </div>
          )}
          <input id="logo" name="logo" type="file" accept="image/*" style={{ display: 'block', marginTop: 4 }} />
          <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>
            Leave blank to keep the current wordmark. PNG with a transparent background works best.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="favicon">Favicon</label>
          {settings.favicon_url && (
            <div style={{ margin: '8px 0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.favicon_url}
                alt="Current favicon"
                style={{ width: 40, height: 40, background: '#eee', padding: 4, borderRadius: 4 }}
              />
            </div>
          )}
          <input
            id="favicon"
            name="favicon"
            type="file"
            accept="image/*"
            style={{ display: 'block', marginTop: 4 }}
          />
          <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>
            A square image works best — it gets resized down automatically.
          </p>
        </div>

        <h3 style={{ marginTop: 28, marginBottom: 12 }}>Header</h3>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="headerStyle">Header style</label>
          <select
            id="headerStyle"
            name="headerStyle"
            defaultValue={settings.header_style}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="solid">Solid bar (current)</option>
            <option value="image">Full-width image, with the logo &amp; nav on top</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="headerImage">Header background image</label>
          {settings.header_image_url && (
            <div style={{ margin: '8px 0' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.header_image_url}
                alt="Current header background"
                style={{ maxWidth: 300, borderRadius: 4 }}
              />
            </div>
          )}
          <input
            id="headerImage"
            name="headerImage"
            type="file"
            accept="image/*"
            style={{ display: 'block', marginTop: 4 }}
          />
          <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>
            Only used when header style is set to the full-width image option. A wide landscape
            photo works best.
          </p>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="headerOverlayTheme">Logo &amp; nav color over the header image</label>
          <select
            id="headerOverlayTheme"
            name="headerOverlayTheme"
            defaultValue={settings.header_overlay_theme}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          >
            <option value="light">Light (for a darker photo)</option>
            <option value="dark">Dark (for a lighter photo)</option>
          </select>
        </div>

        <h3 style={{ marginTop: 28, marginBottom: 12 }}>Colors &amp; fonts</h3>

        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div>
            <label htmlFor="accentColor" style={{ display: 'block' }}>
              Accent color
            </label>
            <input
              id="accentColor"
              name="accentColor"
              type="color"
              defaultValue={settings.accent_color}
              style={{ width: 60, height: 36, padding: 0, border: 'none', marginTop: 4 }}
            />
            <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4, maxWidth: 220 }}>
              Buttons and the hero script line.
            </p>
          </div>
          <div>
            <label htmlFor="inkColor" style={{ display: 'block' }}>
              Ink color
            </label>
            <input
              id="inkColor"
              name="inkColor"
              type="color"
              defaultValue={settings.ink_color}
              style={{ width: 60, height: 36, padding: 0, border: 'none', marginTop: 4 }}
            />
            <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4, maxWidth: 220 }}>
              Headings, body text, and the footer background.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="headingFont">Heading font</label>
            <select
              id="headingFont"
              name="headingFont"
              defaultValue={settings.heading_font}
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            >
              {HEADING_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="bodyFont">Body font</label>
            <select
              id="bodyFont"
              name="bodyFont"
              defaultValue={settings.body_font}
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            >
              {BODY_FONT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h3 style={{ marginTop: 28, marginBottom: 12 }}>Social links</h3>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="instagramUrl">Instagram</label>
          <input
            id="instagramUrl"
            name="instagramUrl"
            type="text"
            defaultValue={settings.instagram_url ?? ''}
            placeholder="https://instagram.com/..."
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="facebookUrl">Facebook</label>
          <input
            id="facebookUrl"
            name="facebookUrl"
            type="text"
            defaultValue={settings.facebook_url ?? ''}
            placeholder="https://facebook.com/..."
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="pinterestUrl">Pinterest</label>
          <input
            id="pinterestUrl"
            name="pinterestUrl"
            type="text"
            defaultValue={settings.pinterest_url ?? ''}
            placeholder="https://pinterest.com/..."
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="tiktokUrl">TikTok</label>
          <input
            id="tiktokUrl"
            name="tiktokUrl"
            type="text"
            defaultValue={settings.tiktok_url ?? ''}
            placeholder="https://tiktok.com/@..."
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>

        <h3 style={{ marginTop: 28, marginBottom: 12 }}>Contact info</h3>

        <div style={{ marginBottom: 12 }}>
          <label htmlFor="contactPhone">Phone</label>
          <input
            id="contactPhone"
            name="contactPhone"
            type="text"
            defaultValue={settings.contact_phone ?? ''}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="contactEmail">Email</label>
          <input
            id="contactEmail"
            name="contactEmail"
            type="text"
            defaultValue={settings.contact_email ?? ''}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="contactAddress">Address</label>
          <input
            id="contactAddress"
            name="contactAddress"
            type="text"
            defaultValue={settings.contact_address ?? ''}
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </div>

        <button type="submit" style={{ padding: '8px 16px' }}>
          Save settings
        </button>
      </form>
    </div>
  );
}
