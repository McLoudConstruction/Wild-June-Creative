import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Wild June Creative',
  description: 'Photography sessions, bookings, and client galleries.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
