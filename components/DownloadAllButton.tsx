'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import { Monitor, Printer } from 'lucide-react';

const ICONS = { web: Monitor, full: Printer };

// Once a zip being built would cross this size, it gets sealed and
// downloaded immediately, and a fresh zip starts for the rest. This
// keeps memory use bounded (only ever holding one zip's worth of
// photos in memory, not the whole gallery at once) and keeps each
// downloaded file at a size that's actually practical to download and
// open, rather than one multi-gigabyte archive for a full 200-photo
// gallery.
const MAX_ZIP_BYTES = 500 * 1024 * 1024; // 500MB

type Item = { url: string; filename: string };

export function DownloadAllButton({
  items,
  label,
  baseFilename = 'gallery',
  icon,
}: {
  items: Item[];
  label: string;
  baseFilename?: string;
  // 'web' (a monitor — sized for screens) or 'full' (a printer —
  // full quality, sized for printing).
  icon?: 'web' | 'full';
}) {
  const [status, setStatus] = useState<string | null>(null);
  const Icon = icon ? ICONS[icon] : null;

  async function downloadZipPart(zip: JSZip, partNumber: number) {
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `${baseFilename}-part-${partNumber}.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(blobUrl);
  }

  async function handleDownloadAll() {
    if (items.length === 0) return;

    let zip = new JSZip();
    let zipSizeBytes = 0;
    let filesInZip = 0;
    let partNumber = 1;

    for (let i = 0; i < items.length; i++) {
      setStatus(`Fetching photo ${i + 1} of ${items.length}…`);

      let blob: Blob;
      try {
        const response = await fetch(items[i].url);
        blob = await response.blob();
      } catch {
        // Skip whatever failed to fetch and keep going — one bad
        // file shouldn't derail the rest of the download.
        continue;
      }

      // Cut over to a new zip if this photo would push the current
      // one past the size cap — but never split when the zip is
      // still empty, since a single oversized file can't be split
      // further anyway.
      if (filesInZip > 0 && zipSizeBytes + blob.size > MAX_ZIP_BYTES) {
        setStatus(`Packaging part ${partNumber}…`);
        await downloadZipPart(zip, partNumber);
        partNumber += 1;
        zip = new JSZip();
        zipSizeBytes = 0;
        filesInZip = 0;
        // Brief pause between multi-part downloads so the browser
        // doesn't flag rapid back-to-back downloads.
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      zip.file(items[i].filename, blob);
      zipSizeBytes += blob.size;
      filesInZip += 1;
    }

    if (filesInZip > 0) {
      setStatus(partNumber > 1 ? `Packaging part ${partNumber}…` : 'Packaging your download…');
      await downloadZipPart(zip, partNumber);
    }

    setStatus(null);
  }

  return (
    <button
      onClick={handleDownloadAll}
      disabled={!!status || items.length === 0}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '10px 20px',
        fontSize: 13,
      }}
    >
      {status ?? (
        <>
          {Icon && <Icon size={15} />}
          {label}
        </>
      )}
    </button>
  );
}
