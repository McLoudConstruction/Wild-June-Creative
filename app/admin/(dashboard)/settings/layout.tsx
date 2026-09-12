import { SettingsSubNav } from '@/components/admin/SettingsSubNav';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1>Settings</h1>
      <SettingsSubNav />
      {children}
    </div>
  );
}
