// Resizes and re-encodes an image entirely in the browser, before any
// bytes go over the network. This replaces a flow that used to be:
// upload the raw file (often 10-25MB straight off a camera) to
// staging, then a server function downloads it, runs it through
// sharp, and re-uploads the result — two full-size network transfers
// plus a server round trip, all for what was ultimately a ~1-3MB
// final image. Compressing client-side means the browser only ever
// uploads the small final version, which is the actual fix for slow
// uploads on a typical home connection (upload bandwidth is usually
// far below download bandwidth, so shrinking what has to go up
// matters far more than anything on the server side).
//
// Falls back to returning the original file untouched if the browser
// can't decode it (e.g. some HEIC files aren't supported outside
// Safari) — the caller ends up uploading the original in that case,
// which is slower but still works rather than failing outright.
export async function compressImageFile(
  file: File,
  {
    maxDimension,
    quality = 0.85,
    mimeType = 'image/jpeg',
  }: { maxDimension: number; quality?: number; mimeType?: 'image/jpeg' | 'image/png' }
): Promise<File | Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

    let { width, height } = bitmap;
    if (width > maxDimension || height > maxDimension) {
      const scale = maxDimension / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, mimeType, mimeType === 'image/jpeg' ? quality : undefined);
    });

    return blob ?? file;
  } catch {
    return file;
  }
}
