'use server';

import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { createAdminClient } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof createAdminClient>;

// Resizes and re-encodes to PNG (keeps transparency for logos), then
// uploads to the public site-assets bucket and returns its public
// URL. Returns an error string instead of throwing so the caller can
// redirect with it — Next's redirect() works by throwing internally,
// which a try/catch around this would swallow.
async function uploadBrandingAsset(
  supabase: AdminClient,
  file: File,
  pathPrefix: string,
  maxDimension: number
): Promise<{ url?: string; error?: string }> {
  let resized: Buffer;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    resized = await sharp(buffer)
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();
  } catch (err) {
    return { error: `Couldn't process image: ${err instanceof Error ? err.message : 'unknown error'}` };
  }

  const path = `${pathPrefix}-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from('site-assets')
    .upload(path, resized, { contentType: 'image/png', upsert: true });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
  return { url: data.publicUrl };
}

export async function updateBrandingAction(formData: FormData) {
  const supabase = createAdminClient();

  const headerStyle = formData.get('headerStyle') as string;

  const updatePayload: Record<string, unknown> = {
    id: true,
    header_style: headerStyle,
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

  const logoFile = formData.get('logo') as File | null;
  if (logoFile && logoFile.size > 0) {
    const result = await uploadBrandingAsset(supabase, logoFile, '_branding/logo', 600);
    if (result.error) {
      redirect(`/admin/settings/branding?error=${encodeURIComponent(result.error)}`);
    }
    updatePayload.logo_url = result.url;
  }

  const faviconFile = formData.get('favicon') as File | null;
  if (faviconFile && faviconFile.size > 0) {
    const result = await uploadBrandingAsset(supabase, faviconFile, '_branding/favicon', 256);
    if (result.error) {
      redirect(`/admin/settings/branding?error=${encodeURIComponent(result.error)}`);
    }
    updatePayload.favicon_url = result.url;
  }

  const headerImageFile = formData.get('headerImage') as File | null;
  if (headerImageFile && headerImageFile.size > 0) {
    const result = await uploadBrandingAsset(supabase, headerImageFile, '_branding/header', 2400);
    if (result.error) {
      redirect(`/admin/settings/branding?error=${encodeURIComponent(result.error)}`);
    }
    updatePayload.header_image_url = result.url;
  }

  // A file <input> can't remember a previously chosen file across a
  // page reload — so if this save switches to the image header style
  // without a new file attached this time, the only way that's valid
  // is if an image is already saved from an earlier submit. Otherwise
  // it'd silently save a style with nothing to show, and the header
  // would just look unchanged with no indication why.
  if (headerStyle === 'image' && !updatePayload.header_image_url) {
    const { data: current } = await supabase
      .from('site_settings')
      .select('header_image_url')
      .eq('id', true)
      .maybeSingle();

    if (!current?.header_image_url) {
      redirect(
        `/admin/settings/branding?error=${encodeURIComponent(
          "Choose a header background image before saving — the file picker doesn't keep your last selection after a page reload, so it needs to be selected again."
        )}`
      );
    }
  }

  const { error } = await supabase.from('site_settings').upsert(updatePayload);

  if (error) {
    redirect(`/admin/settings/branding?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/admin/settings/branding?success=1');
}
