import Link from 'next/link';

export function BackToDashboard() {
  return (
    <Link
      href="/admin"
      style={{
        fontSize: 13,
        color: '#666',
        textDecoration: 'none',
        display: 'inline-block',
        marginBottom: 16,
      }}
    >
      ← Back to dashboard
    </Link>
  );
}
