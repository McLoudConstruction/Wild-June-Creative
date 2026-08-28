import { redirect } from 'next/navigation';

// Watermark is the only settings item left now that Packages lives
// under Sales, so the Settings nav link goes straight there instead
// of showing an index with a single link on it.
export default function SettingsPage() {
  redirect('/admin/settings/watermark');
}
