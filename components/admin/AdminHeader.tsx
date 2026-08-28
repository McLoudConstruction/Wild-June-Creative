import Image from 'next/image';
import Link from 'next/link';

export function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="container header-row">
        <Link href="/admin" aria-label="Wild June Creative admin home">
          <Image
            src="/brand/wordmark-dark.png"
            alt="Wild June Creative"
            width={1593}
            height={483}
            priority
            style={{ height: 'auto', width: '160px' }}
          />
        </Link>
        <span
          style={{
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--warm-gray)',
          }}
        >
          Studio admin
        </span>
      </div>
    </header>
  );
}
