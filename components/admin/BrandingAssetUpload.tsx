'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSignedBrandingUploadUrl, processBrandingUpload } from '@/lib/admin/settings-actions';

type AssetType = 'logo' | 'favicon' | 'header';

// Drives one image field on the Branding form. The file goes browser
// → Supabase Storage directly (never through a Vercel function, so
// there's no 4.5MB platform limit to hit), then a server action
// resizes/finalizes it and hands back a public URL. That URL sits in
// a hidden field with `name` so it rides along with the rest of the
// form's normal text submission — the <form>'s own action never
// touches image bytes at all.
export function BrandingAssetUpload({
  name,
  assetType,
  label,
  helperText,
  initialUrl,
  previewSize = 200,
}: {
  name: string;
  assetType: AssetType;
  label: string;
  helperText?: string;
  initialUrl: string | null;
  previewSize?: number;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const { path, token } = await getSignedBrandingUploadUrl(assetType, file.name);

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('site-assets')
        .uploadToSignedUrl(path, token, file);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const result = await processBrandingUpload(path, assetType);

      if (result.error || !result.url) {
        throw new Error(result.error ?? 'Upload failed');
      }

      setUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={`${name}-file`}>{label}</label>

      {url && (
        <div style={{ margin: '8px 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            style={{ maxWidth: previewSize, background: '#eee', padding: 8, borderRadius: 4 }}
          />
        </div>
      )}

      <input
        id={`${name}-file`}
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={uploading}
        style={{ display: 'block', marginTop: 4 }}
      />

      {uploading && (
        <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>Uploading…</p>
      )}
      {error && <p style={{ fontSize: 12, color: 'crimson', marginTop: 4 }}>{error}</p>}
      {helperText && (
        <p style={{ fontSize: 12, color: 'var(--warm-gray)', marginTop: 4 }}>{helperText}</p>
      )}

      <input type="hidden" name={name} value={url} />
    </div>
  );
}
