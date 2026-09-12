'use server';

import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

type AssetType = 'logo' | 'favicon' | 'header';

const MAX_DIMENSIONS: Record<AssetType, number> = {
  logo: 600,
  favicon: 256,
  header: 2400,
};

// Step 1 — called from the browser (BrandingAssetUpload) before any
// bytes move. Returns a short-lived signed upload token so the file
// goes straight from the browser to Supabase Storage, never through
// this Vercel function. That's not just an optimization: Vercel's
// serverless functions have a hard 4.5MB request body limit that no
// app-level config can raise, and a real camera photo routinely
// exceeds it. Routing bytes through a Server Action (as this used to)
// meant uploads silently failed above that size, with no error and no
// server log, since Vercel rejects the request before the function
// ever runs. Same pattern as the gallery photo uploader in
// lib/admin/upload-actions.ts.
export async function getSignedBrandingUploadUrl(assetType: AssetType, fileName: string) {
  const supabase = createAdminClient();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stagingPath = `_incoming/${assetType}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;

  const { data, error } = await supabase.storage.from('site-assets').createSignedUploadUrl(stagingPath);

  if (error || !data) {
    throw new Error(`Couldn't prepare upload: ${error?.message ?? 'unknown error'}`);
  }

  return { path: data.path, token: data.token };
}

// Step 2 — called right after the browser finishes uploading the raw
// file to the staging path above. The payload here is just a path
// string, so it's tiny regardless of how large the original photo
// was — this is where the actual resize/re-encode happens.
export async function processBrandingUpload(
  stagingPath: string,
  assetType: AssetType
): Promise<{ url?: string; error?: string }> {
  const supabase = createAdminClient();

  const { data: rawFile, error: downloadError } = await supabase.storage
    .from('site-assets')
    .download(stagingPath);

  if (downloadError || !rawFile) {
    return { error: `Couldn't read uploaded file: ${downloadError?.message ?? 'unknown error'}` };
  }

  let resized: Buffer;
  try {
    const buffer = Buffer.from(await rawFile.arrayBuffer());
    resized = await sharp(buffer)
      .rotate()
      .resize({
        width: MAX_DIMENSIONS[assetType],
        height: MAX_DIMENSIONS[assetType],
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch (err) {
    await supabase.storage.from('site-assets').remove([stagingPath]);
    return { error: `Couldn't process image: ${err instanceof Error ? err.message : 'unknown error'}` };
  }

  const finalPath = `_branding/${assetType}-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from('site-assets')
    .upload(finalPath, resized, { contentType: 'image/png', upsert: true });

  await supabase.storage.from('site-assets').remove([stagingPath]);

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from('site-assets').getPublicUrl(finalPath);
  return { url: data.publicUrl };
}

// The main form submit. Image fields arrive as plain URL strings now
// (already uploaded and processed by the two actions above before
// this ever runs) — so this action's whole request body is just text,
// nowhere close to any size limit.
// Called directly from the fullscreen page editor's sidebar dropdown
// — a single-field save so picking a new position applies (and
// persists) without leaving the editor or touching anything else in
// site_settings.
export async function updateLogoPosition(
  position: 'left' | 'center' | 'right'
): Promise<{ error: string | null }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('site_settings')
    .upsert({ id: true, logo_position: position, updated_at: new Date().toISOString() });

  return { error: error?.message ?? null };
}

export async function updateBrandingAction(formData: FormData) {
  const supabase = createAdminClient();

  const headerStyle = formData.get('headerStyle') as string;
  const headerImageUrl = (formData.get('headerImageUrl') as string) || null;

  if (headerStyle === 'image' && !headerImageUrl) {
    redirect(
      `/admin/settings/branding?error=${encodeURIComponent(
        'Choose a header background image before saving the full-width image style.'
      )}`
    );
  }

  const updatePayload: Record<string, unknown> = {
    id: true,
    logo_url: (formData.get('logoUrl') as string) || null,
    favicon_url: (formData.get('faviconUrl') as string) || null,
    header_style: headerStyle,
    header_image_url: headerImageUrl,
    header_overlay_theme: formData.get('headerOverlayTheme') as string,
    accent_color: formData.get('accentColor') as string,
    ink_color: formData.get('inkColor') as string,
    heading_font: formData.get('headingFont') as string,
    body_font: formData.get('bodyFont') as string,
    instagram_url: (formData.get('instagramUrl') as string) || null,
    facebook_url: (formData.get('facebookUrl') as string) || null,
    pinterest_url: (formData.get('pinterestUrl') as string) || null,
    tiktok_url: (formData.get('tiktokUrl') as string) || null,
    contact_phone: (formData.get('contactPhone') as string) || null,
    contact_email: (formData.get('contactEmail') as string) || null,
    contact_address: (formData.get('contactAddress') as string) || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('site_settings').upsert(updatePayload);

  if (error) {
    redirect(`/admin/settings/branding?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin/settings/branding?success=1');
}
