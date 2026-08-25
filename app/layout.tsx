import type { Metadata } from 'next';
import { Playfair_Display, Jost, Alex_Brush } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
});

const script = Alex_Brush({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-script',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Wild June Creative | Kansas City Photography',
  description:
    'Personal and business photography around the Kansas City area. Family sessions, portraits, and small business photography by Wild June Creative.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${jost.variable} ${script.variable}`}>
      <body>{children}</body>
    </html>
  );
}
