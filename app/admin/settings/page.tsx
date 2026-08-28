import Link from 'next/link';

const SETTINGS_LINKS = [
  {
    href: '/admin/settings/packages',
    title: 'Session packages',
    description: 'What shows up on the public booking page — pricing, deposits, and gallery windows.',
  },
  {
    href: '/admin/settings/watermark',
    title: 'Watermark',
    description: 'The logo, position, and opacity applied to watermarked photo uploads.',
  },
];

export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 520 }}>
        {SETTINGS_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: 'block',
              padding: 16,
              border: '1px solid #e5e0d8',
              borderRadius: 8,
              textDecoration: 'none',
              background: '#fff',
            }}
          >
            <strong>{link.title}</strong>
            <p style={{ color: '#666', fontSize: 14, margin: '4px 0 0' }}>{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
