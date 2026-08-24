'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSignedUploadUrl, processStagedPhoto } from '@/lib/admin/upload-actions';

// How many photos process at once. Higher isn't necessarily faster —
// each one spins up sharp compression work server-side, so this caps
// how much runs in parallel rather than trying to blast all 200 at
// the same instant.
const CONCURRENCY = 3;

export function GalleryUploader({
  galleryId,
  watermarkConfigured,
}: {
  galleryId: string;
  watermarkConfigured: boolean;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [applyWatermark, setApplyWatermark] = useState(watermarkConfigured);
  const [uploading, setUploading] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const total = files.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  async function handleUpload() {
    if (files.length === 0) return;

    setUploading(true);
    setCompleted(0);
    setErrors([]);

    const supabase = createClient();
    const queue = files;
    let nextIndex = 0;
    let doneCount = 0;
    const collectedErrors: string[] = [];

    async function worker() {
      while (nextIndex < queue.length) {
        const currentIndex = nextIndex++;
        const file = queue[currentIndex];

        try {
          // Step 1: get permission to upload this one file directly.
          const { path, token } = await getSignedUploadUrl(galleryId, file.name);

          // Step 2: the actual bytes go browser → Supabase directly,
          // never touching our server.
          const { error: uploadError } = await supabase.storage
            .from('galleries')
            .uploadToSignedUrl(path, token, file);

          if (uploadError) {
            throw new Error(uploadError.message);
          }

          // Step 3: tell our server it's ready to be compressed,
          // watermarked, and turned into its final form.
          const result = await processStagedPhoto({
            galleryId,
            stagingPath: path,
            fileName: file.name,
            applyWatermark,
            sortOrder: currentIndex,
          });

          if (!result.success) {
            collectedErrors.push(`${file.name}: ${result.error}`);
          }
        } catch (err) {
          collectedErrors.push(
            `${file.name}: ${err instanceof Error ? err.message : 'upload failed'}`
          );
        }

        doneCount += 1;
        setCompleted(doneCount);
      }
    }

    const workerCount = Math.min(CONCURRENCY, queue.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    setErrors(collectedErrors);
    setUploading(false);
    setFiles([]);

    // Simplest reliable way to show the newly-uploaded photos in the
    // grid below, which is rendered server-side.
    window.location.reload();
  }

  return (
    <div style={{ margin: '16px 0', maxWidth: 480 }}>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={uploading}
        onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
      />

      <div style={{ marginTop: 8 }}>
        <label>
          <input
            type="checkbox"
            checked={applyWatermark}
            disabled={!watermarkConfigured || uploading}
            onChange={(e) => setApplyWatermark(e.target.checked)}
          />{' '}
          Apply watermark to these photos
          {!watermarkConfigured && <span style={{ color: '#888' }}> — set one up first</span>}
        </label>
      </div>

      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        style={{ padding: '8px 16px', marginTop: 8 }}
      >
        {uploading
          ? `Uploading… (${completed}/${total})`
          : `Upload ${files.length || ''} photo${files.length === 1 ? '' : 's'}`.trim()}
      </button>

      {uploading && (
        <>
          <div
            style={{
              marginTop: 12,
              background: '#eee',
              borderRadius: 4,
              overflow: 'hidden',
              height: 10,
            }}
          >
            <div
              style={{
                width: `${percent}%`,
                background: '#2563eb',
                height: '100%',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {percent}% complete — {completed} of {total} photos
          </p>
        </>
      )}

      {errors.length > 0 && (
        <div style={{ marginTop: 12, color: 'crimson', fontSize: 13 }}>
          <p>{errors.length} file(s) had problems:</p>
          <ul style={{ paddingLeft: 20 }}>
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
