import { SalesSubNav } from '@/components/admin/SalesSubNav';

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1>Sales</h1>
      <SalesSubNav />
      {children}
    </div>
  );
}
