import { Header } from '@/components/site/Header';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
