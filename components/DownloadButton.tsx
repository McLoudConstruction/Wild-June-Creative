'use client';

import { useState } from 'react';
import { Monitor, Printer } from 'lucide-react';

const ICONS = { web: Monitor, full: Printer };

// A plain <a download href="..."> doesn't force a real download when
// the URL is cross-origin (which signed Supabase Storage URLs always
// are) — most browsers just navigate to it instead. Fetching the
// image as a blob and downloading from a same-origin blob: URL is
// what actually forces the save dialog regardless of where the file
// is hosted.
export function DownloadButton({
  url,
  filename,
  label,
  icon,
}: {
  url: string;
  filename: string;
  label: string;
  // 'web' (a monitor — this version is sized for screens) or 'full'
  // (a printer — this version is full quality, sized for printing).
  icon?: 'web' | 'full';
}) {
  const [downloading, setDownloading] = useState(false);
  const Icon = icon ? ICONS[icon] : null;

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert("That download didn't go through — please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        padding: '4px 9px',
        background: 'rgba(255,255,255,0.92)',
        border: 'none',
        borderRadius: 3,
        cursor: downloading ? 'default' : 'pointer',
      }}
    >
      {downloading ? '…' : (
        <>
          {Icon && <Icon size={13} />}
          {label}
        </>
      )}
    </button>
  );
}
